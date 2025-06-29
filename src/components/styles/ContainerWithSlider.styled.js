import styled from "styled-components";

export const Columns = styled.div`
  width: 80%;
  display: flex;
`;

export const Column2 = styled.div`
  float: left;
  margin: 1rem;
  width: calc(50% - 2rem);
`;

export const Column4 = styled.div`
  float: center;
  margin: 1rem;
  width: calc(25% - 4rem);
  a {
    display: flex;
    flex-direction: column;
    align-items: center;
    img {
      width: 100%;
    }
  }
`;

export const ColumnFlex = styled.div`
  display: flex;
  flex-direction: column;
  margin: 1rem;
  width: calc(100% - 2rem);
  a {
    display: flex;
    flex-direction: column;
    align-items: center;
    img {
      width: 100%;
    }
  }
`;