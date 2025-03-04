const axios = require("axios");
const crypto = require("crypto");
const cheerio = require("cheerio");
var qs = require("qs");
var fs = require("fs");
// const ign_proxy = {
//   protocol: 'http',
//   host: 'proxy.ign.fr',
//   port: 3128,
// }
const ign_proxy = {};

var peopleCsvLines = 0;
var personNodes = 0;

exports.onPreBootstrap = async function ({ reporter }) {
  // Read the file
  await fs.readFile("src/data/people.csv", "utf8", (err, data) => {
    if (err) {
      console.error(`Error reading file: ${err}`);
      return;
    }
    // Split the data into lines
    const lines = data.split("\n");
    // Count non-empty lines (without header)
    peopleCsvLines = lines.filter((line) => line.trim() !== "").length - 1;
    reporter.info(`${peopleCsvLines} lines in people.csv`);
  });
};
exports.createPages = async function ({ actions, graphql, reporter }) {
  var { data } = await graphql(`
    query {
      allPeopleCsv {
        nodes {
          HAL
          end_date
          firstname
          id
          lastname
          member
          perm
          photo
          start_date
          status
          statut
          team
          webpage
        }
      }
    }
  `);
  data.allPeopleCsv.nodes.forEach((node) => {
    const firstName = node.firstname;
    const lastName = node.lastname;
    //console.log(`${node.firstname}-${node.lastname}`);
    actions.createPage({
      path: `/members/${node.firstname}-${node.lastname}`,
      component: require.resolve(`./src/templates/member-page.js`),
      context: { firstName: firstName, lastName: lastName },
    });
  });
  const teams = ["STRUDEL", "ACTE", "MEIG", "GEOVIS"];
  teams.forEach((team) => {
    reporter.info(`Creating pages for team ${team}`);
    actions.createPage({
      path: `/teams/${team.toLowerCase()}/publications`,
      component: require.resolve(`./src/templates/publications.js`),
      context: { team: [team] },
    });
    actions.createPage({
      path: `/teams/${team.toLowerCase()}/datasets`,
      component: require.resolve(`./src/templates/datasets.js`),
      context: { team: [team] },
    });
    actions.createPage({
      path: `/teams/${team.toLowerCase()}/members`,
      component: require.resolve(`./src/templates/members-page.js`),
      context: { team: [team] },
    });
    actions.createPage({
      path: `/teams/${team.toLowerCase()}/projects`,
      component: require.resolve(`./src/templates/projects.js`),
      context: { team: [team] },
    });
    actions.createPage({
      path: `/teams/${team.toLowerCase()}/softwares`,
      component: require.resolve(`./src/templates/softwares.js`),
      context: { team: [team] },
    });
  });
  actions.createPage({
    path: `/publications`,
    component: require.resolve(`./src/templates/publications.js`),
    context: { team: ["ACTE", "GEOVIS", "MEIG", "STRUDEL"] },
  });
  actions.createPage({
    path: `/datasets`,
    component: require.resolve(`./src/templates/datasets.js`),
    context: { team: ["ACTE", "GEOVIS", "MEIG", "STRUDEL"] },
  });
  actions.createPage({
    path: `/projects`,
    component: require.resolve(`./src/templates/projects.js`),
    context: { team: ["ACTE", "GEOVIS", "MEIG", "STRUDEL"] },
  });
  actions.createPage({
    path: `/members`,
    component: require.resolve(`./src/templates/members-page.js`),
    context: { team: ["ACTE", "GEOVIS", "MEIG", "STRUDEL"] },
  });
  actions.createPage({
    path: `/softwares`,
    component: require.resolve(`./src/templates/softwares.js`),
    context: { team: ["ACTE", "GEOVIS", "MEIG", "STRUDEL"] },
  });
};

const fields = [
  "fileAnnexes_s",
  "fileAnnexesFigure_s",
  "invitedCommunication_s",
  "proceedings_s",
  "popularLevel_s",
  "halId_s",
  "authIdHalFullName_fs",
  "producedDateY_i",
  "docType_s",
  "files_s",
  "fileMain_s",
  "fileMainAnnex_s",
  "linkExtUrl_s",
  "title_s",
  "en_title_s",
  "fr_title_s",
  "label_bibtex",
  "citationRef_s",
  "labStructId_i",
  "journalTitle_s",
  "researchData_s",
  "peerReviewing_s",
  "audience_s",
  "doiId_s",
  "softCodeRepository_s",
  "arxivId_s",
  "anrProjectTitle_s",
  "europeanProjectTitle_s",
  "publicationDate_s",
  "journalUrl_s",
  "keyword_s",
];
exports.sourceNodes = async ({ actions, getNodes, reporter }) => {
  console.log("sourceNodes!!");
  // console.log(`sourceNodes ${getNodes().map((node) => node.internal.type)}`);
  const { createNode } = actions;
  // fetch raw data from the HAL api
  const queryParams = {
    q: "*",
    wt: "json",
    sort: "producedDateY_i desc",
    rows: 10000,
    fl: fields.join(","),
    fq: "((labStructId_i:1003089 OR labStructId_i:536752) producedDateY_i:[2019 TO *])",
  };
  const params = qs.stringify(queryParams);
  await axios
    .get(
      `https://api.archives-ouvertes.fr/search/?${params}`,
      (proxy = ign_proxy)
    )
    .then((res) => {
      reporter.info(`Found ${res.data.response.docs.length} publications`);
      // map into these results and create nodes
      res.data.response.docs.map((doc, i) => {
        // Create your node object
        const authors = doc.authIdHalFullName_fs.map((authIdHalFullName) => {
          const [_idHal, _fullName] = authIdHalFullName.split("_FacetSep_");
          return { fullName: _fullName, idHal: _idHal };
        });
        const docNode = {
          // Required fields
          id: `${i}`,
          parent: `__SOURCE__`,
          internal: {
            type: `HAL`, // name of the graphQL query --> allHAL {}
            // contentDigest will be added just after but it is required
          },
          children: [],
          // Other fields that you want to query with graphQl
          title: doc.title_s,
          halId: doc.halId_s,
          authIdHalFullName: authors,
          docType: doc.docType_s,
          producedDate: doc.producedDateY_i,
          fileMain: doc.fileMain_s,
          files: doc.files_s,
          citationRef: doc.citationRef_s,
          label_bibtex: doc.label_bibtex,
          proceedings: doc.proceedings_s,
          popularLevel: doc.popularLevel_s,
          invitedCommunication: doc.invitedCommunication_s,
          peerReviewing: doc.peerReviewing_s,
          researchData: doc.researchData_s,
          audience: doc.audience_s,
          doiId: doc.doiId_s,
          softCodeRepository: doc.softCodeRepository_s,
          arxivId: doc.arxivId_s,
          anrProjectTitle: doc.anrProjectTitle_s,
          europeanProjectTitle: doc.europeanProjectTitle_s,
          publicationDate: doc.publicationDate_s,
          keywords: doc.keyword_s,
        };
        // Get content digest of node. (Required field)
        const contentDigest = crypto
          .createHash(`md5`)
          .update(JSON.stringify(docNode))
          .digest(`hex`);
        // add it to userNode
        docNode.internal.contentDigest = contentDigest;
        // Create node with the gatsby createNode() API
        createNode(docNode);
      });
    })
    .catch((err) => reporter.error(err));
};

var lastNodeDisplayed = 0;
function waitForCsv() {
  const poll = (resolve) => {
    if (lastNodeDisplayed != personNodes) {
      console.log(`${personNodes} / ${peopleCsvLines}`);
      lastNodeDisplayed = personNodes;
    }
    if (personNodes == peopleCsvLines) resolve();
    else setTimeout((_) => poll(resolve), 100);
  };
  return new Promise(poll);
}
const { createRemoteFileNode } = require("gatsby-source-filesystem");
exports.onCreateNode = async ({
  node, // the node that was just created
  actions: { createNode, createNodeField },
  getNodesByType,
  reporter,
  createNodeId,
  getCache,
}) => {
  //console.log(`onCreateNode ${node.internal.type}`);
  if (node.internal.type === `DatasetCsv`) {
    var url = node.url;
    if (url.includes("zenodo")) {
      url = url.replace("/records/", "/api/records/");
      // console.log("Z = "+url)
      await axios.get(url, (proxy = ign_proxy)).then((res) => {
        const downloads = res.data["stats"]["downloads"];
        // console.log(`Z => ${downloads}`)
        createNodeField({ node, name: "downloads", value: +downloads });
      });
    } else {
      if (
        url.includes("dataverse") ||
        url.includes("entrepot.recherche.data.gouv.fr")
      ) {
        // console.log("D = " + url);
        await axios.get(url, (proxy = ign_proxy)).then(({ data }) => {
          const $ = cheerio.load(data);
          const downloads = $(".metrics-count-block")
            .map((_, block) => {
              const $block = $(block);
              return $block
                .text()
                .substring(0, $block.text().indexOf(" Downloads"))
                .replace(",", "");
            })
            .toArray()[0];
          // console.log(`D => ${downloads}`)
          createNodeField({ node, name: "downloads", value: +downloads });
        });
      } else {
        if (url.includes("figshare")) {
          const dataId = url.substring(url.lastIndexOf("/") + 1);
          // console.log(`F = ${url} (${dataId})`);
          await axios
            .get(
              `https://stats.figshare.com/total/article/${dataId}`,
              (proxy = ign_proxy)
            )
            .then((res) => {
              const downloads = res.data["downloads"];
              // console.log(`F => ${downloads} from ${`https://stats.figshare.com/total/article/${dataId}`}`)
              createNodeField({ node, name: "downloads", value: +downloads });
            });
        } else {
          if (url.includes("mendeley")) {
            // console.log("M = "+ url);
            const dataId = url.substring(url.lastIndexOf("/") + 1);
            await axios
              .get(
                `https://api.plu.mx/widget/elsevier/artifact?type=mendeley_data_id&id=${dataId}&hidePrint=true&site=plum&href=https://plu.mx/plum/a?mendeley_data_id=${dataId}`,
                (proxy = ign_proxy)
              )
              .then((res) => {
                const downloads = res.data["statistics"]["Usage"][0]["count"];
                // console.log("M => " + downloads)
                createNodeField({ node, name: "downloads", value: +downloads });
              });
          } else {
            // console.log("OTHER = " + url)
            createNodeField({ node, name: "downloads", value: Number(0) });
          }
        }
      }
    }
    if (node.image_url !== null && node.image_url) {
      reporter.info(`Image url = ${node.image_url}.`);
      const fileNode = await createRemoteFileNode({
        url: node.image_url, // string that points to the URL of the image
        parentNodeId: node.id, // id of the parent node of the fileNode you are going to create
        createNode, // helper function in gatsby-node to generate the node
        createNodeId, // helper function in gatsby-node to generate the node id
        getCache,
      });
      // if the file was created, extend the node with "image"
      if (fileNode) {
        createNodeField({ node, name: "image", value: fileNode.id });
      }
    }
  } else {
    if (node.internal.type === `HAL`) {
      await waitForCsv();
      reporter.info("Im done waiting for people.csv!!!");
      const peopleData = getNodesByType("PeopleCsv");
      // Identify the teams
      function match(person, author) {
        function getInitials(name) {
          let words = name.split(" ");
          let initials = words.map((word) => word.charAt(0));
          return initials.join(" ").toUpperCase();
        }
        const ignoreNoise = (str) =>
          str.replaceAll("-", " ").replaceAll(".", "");
        const removeAccents = (str) =>
          str.normalize("NFD").replaceAll(/[\u0300-\u036f]/g, "");
        const clean = (str) => ignoreNoise(removeAccents(str));
        const fullName = clean(author.fullName);
        return (
          (person.HAL && author.idHal === person.HAL) ||
          fullName.includes(clean(`${person.firstname} ${person.lastname}`)) ||
          fullName.includes(
            clean(`${person.alt_firstname} ${person.lastname}`)
          ) ||
          fullName.includes(
            clean(`${getInitials(person.firstname)} ${person.lastname}`)
          ) ||
          fullName.includes(clean(`${person.lastname} ${person.firstname}`))
        );
      }
      const teams = Array.from(
        new Set(
          node.authIdHalFullName.flatMap((author) => {
            const people = peopleData.filter((peopleNode) =>
              match(peopleNode, author)
            );
            return people.map((p) => p.team);
          })
        )
      );
      const authorIds = node.authIdHalFullName.flatMap((author) => {
        const people = peopleData.filter((peopleNode) =>
          match(peopleNode, author)
        );
        return people.map((p) => p.id);
      });
      createNodeField({ node, name: "authors", value: authorIds });
      // console.log(node.halId + "(" + teams + ") with " + node.authIdHalFullName.map((a) => `${a.fullName} [${a.idHal}]`).join(', '));
      // if (teams.length == 0) console.log(node.halId + " => " + teams + " => " + node.authIdHalFullName.map((a) => a.fullName).join(', '));
      createNodeField({ node, name: "teams", value: teams });
    } else {
      if (node.internal.type === `PeopleCsv`) {
        const ids = [
          "researcheridId_s",
          "idrefId_s",
          "orcidId_s",
          "viafId_s",
          "isniId_s",
          "google scholarId_s",
          "arxivId_s",
        ];
        const halId = node.HAL;
        if (halId) {
          const url = `https://api.archives-ouvertes.fr/ref/author/?q=idHal_s:${halId}&wt=json&fl=fullName_s,idHal_s,*Id_s`;
          await axios.get(url, (proxy = ign_proxy)).then(({ data }) => {
            if (data.response.docs.length > 0) {
              const doc = data.response.docs[0];
              ids.forEach((id) => {
                createNodeField({
                  node,
                  name: id,
                  value: id in doc ? String(doc[id]) : "",
                });
              });
            } else {
              ids.forEach((id) => {
                createNodeField({ node, name: id, value: "" });
              });
            }
          });
        } else {
          ids.forEach((id) => {
            createNodeField({ node, name: id, value: "" });
          });
        }
        personNodes++;
      } else {
        if (
          node.internal.type === `SoftwareCsv` &&
          node.image_url !== null &&
          node.image_url
        ) {
          reporter.info(`Image url = ${node.image_url}.`);
          const fileNode = await createRemoteFileNode({
            url: node.image_url, // string that points to the URL of the image
            parentNodeId: node.id, // id of the parent node of the fileNode you are going to create
            createNode, // helper function in gatsby-node to generate the node
            createNodeId, // helper function in gatsby-node to generate the node id
            getCache,
          });
          // if the file was created, extend the node with "image"
          if (fileNode) {
            createNodeField({ node, name: "image", value: fileNode.id });
          }
        }
      }
    }
  }
};

exports.createSchemaCustomization = ({ actions, schema }) => {
  const { createFieldExtension, createTypes } = actions;
  createFieldExtension({
    name: `defaultArray`,
    extend() {
      return {
        resolve(source, args, context, info) {
          if (source[info.fieldName] == null) {
            return [];
          }
          return source[info.fieldName];
        },
      };
    },
  });
  const typeDefs = [
    `
    type Site implements Node {
      siteMetadata: SiteMetadata
    }
    type SiteMetadata {
      menuLinks: [MenuLinks]!
      menus: teamMenus!
    }
    type teamMenus {
      ACTE: [MenuLinks]!
      GEOVIS: [MenuLinks]!
      MEIG: [MenuLinks]!
      STRUDEL: [MenuLinks]!
    }
    type MenuLinks {
      name: String!
      link: String!
      subMenu: [SubMenu] @defaultArray
    }
    type SubMenu {
      name: String
      link: String
    }
  `,
    schema.buildObjectType({
      name: "DatasetCsv",
      interfaces: ["Node"],
      extensions: {
        infer: true,
      },
      fields: {
        teams: {
          type: "[String]",
          resolve: (src, args, context, info) => {
            const { fieldName } = info;
            const content = src[fieldName];
            const teams = content.split(",").map((str) => str.trim());
            return teams;
          },
        },
        image: {
          type: "File",
          extensions: {
            link: {
              from: "fields.image",
            },
          },
        },
      },
    }),
    schema.buildObjectType({
      name: "ProjectsCsv",
      interfaces: ["Node"],
      extensions: {
        infer: true,
      },
      fields: {
        Teams: {
          type: "[String]",
          resolve: (src, args, context, info) => {
            const { fieldName } = info;
            const content = src[fieldName];
            const teams = content.split(",").map((str) => str.trim());
            return teams;
          },
        },
      },
    }),
    schema.buildObjectType({
      name: "SoftwareCsv",
      interfaces: ["Node"],
      extensions: {
        infer: true,
      },
      fields: {
        teams: {
          type: "[String]",
          resolve: (src, args, context, info) => {
            const { fieldName } = info;
            const content = src[fieldName];
            const teams = content
              .split(",")
              .map((str) => str.trim().toUpperCase());
            return teams;
          },
        },
        image: {
          type: "File",
          extensions: {
            link: {
              from: "fields.image",
            },
          },
        },
      },
    }),
  ];
  createTypes(typeDefs);
};

exports.onPostBuild = async ({ reporter }) => {
  reporter.info("Waiting for plugin to finish...");

  // Add your code here to wait for the plugin to finish
  // You can use promises, async/await, or any other method to wait for the plugin to complete its task

  reporter.info("Plugin has finished.");
};
exports.onPostBootstrap = async ({ reporter }) => {
  reporter.info("Waiting for gatsby-transformer-csv plugin to finish...");

  // Add your code here to wait for the gatsby-transformer-csv plugin to finish
  // You can use promises, async/await, or any other method to wait for the plugin to complete its task

  reporter.info("gatsby-transformer-csv plugin has finished.");
};
