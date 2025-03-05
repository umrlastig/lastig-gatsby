import styled from "styled-components";
import ReactWordcloud from "react-wordcloud";

export const StyledMemberPage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: auto;
  img {
    width: 200px;
  }
  a {
    padding: 10px;
  }
`;
export const Ids = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;
export const StyledWordCloud = styled(ReactWordcloud)`
  display: flex;
  flex-direction: column;
  align-items: center;
`;
