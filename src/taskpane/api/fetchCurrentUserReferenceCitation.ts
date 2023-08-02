import { GET_CONFIG, generateApiUrl } from "../../../api/api";

type Args = {
  getCurrentUserCitation?: boolean;
  organizationID?: number;
  projectID?: number;
};

export const fetchCurrentUserReferenceCitations = async ({
  getCurrentUserCitation,
  organizationID,
  projectID,
}: Args) => {
  const apiJson = { apiPath: "citation_entry/user_citations" };
  let queryString = "?";
  // TODO: calvinhlee - clean this up
  if (organizationID) {
    queryString += `organization_id=${organizationID}&`;
  }
  if (getCurrentUserCitation) {
    queryString += `get_current_user_citations=1&`;
  }

  if (projectID) {
    queryString += `project_id=${projectID}`;
  }

  const config = GET_CONFIG({});

  const res = await fetch(generateApiUrl(apiJson.apiPath, queryString), config);
  const json = await res.json();
  return json;
};

type Payload = {
  // TODO: calvinhlee - expand this as more privacy features are added
  organization: ID;
};

type ReferenceOrgArgs = {
  payload: Payload;
};

export const fetchReferenceOrgProjects = async ({ payload: { organization } }: ReferenceOrgArgs): void => {
  const res = fetch(generateApiUrl(`citation_project/get_projects/${organization}`), GET_CONFIG({}));

  const json = await res.json();
  return json;
};
