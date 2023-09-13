import React, { useContext, createContext, useEffect, useState } from "react";
// import { captureEvent } from "../../../../config/utils/events";
import { GET_CONFIG, RESEARCHHUB_AUTH_TOKEN, generateApiUrl } from "../../../api/api";

export const fetchUserOrgs = async () => {
  const res = await fetch(generateApiUrl("organization/0/get_user_organizations"), GET_CONFIG({}));
  const json = await res.json();
  return json;
};

type ContextType = {
  orgs: Org[];
  currentOrg: Org | undefined;
  setCurrentOrg: null | ((org: Org) => void);
  fetchAndSetUserOrgs: null | (() => void);
  refetchOrgs: () => void;
};

type Org = {
  id?: number;
  name?: string;
  slug?: string;
  member_count?: number;
};

const OrganizationContext = createContext<ContextType>({
  orgs: [],
  setCurrentOrg: () => null,
  currentOrg: {},
  fetchAndSetUserOrgs: null,
  refetchOrgs: () => null,
});

export const useOrgs = () => useContext(OrganizationContext);

export const OrganizationContextProvider = ({ children, isLoggedIn }) => {
  const [orgs, setOrgs] = useState([]);
  const [currentOrg, setCurrentOrg] = useState<Org>({});
  const [fetchTime, setFetchTime] = useState(Date.now());
  const fetchAndSetUserOrgs = async () => {
    let userOrgs;

    try {
      userOrgs = await fetchUserOrgs();

      setOrgs(userOrgs);
      const lastSetId = window.localStorage.getItem("lastOrgId");
      let org = userOrgs[0];
      if (lastSetId) {
        org = userOrgs.find((org) => org.id === parseInt(lastSetId, 10));
      }
      setCurrentOrg(org);
    } catch (error) {
      // captureEvent({
      //   error,
      //   msg: "Failed to fetch user orgs",
      //   data: { userId: user.id, page: "reference-manager" },
      // });
    }
  };

  useEffect(() => {
    if (window.localStorage.getItem(RESEARCHHUB_AUTH_TOKEN) && isLoggedIn) {
      fetchAndSetUserOrgs();
    }
  }, [fetchTime, isLoggedIn]);

  useEffect(() => {
    if (Object.keys(currentOrg).length) {
      window.localStorage.setItem("lastOrgId", currentOrg.id.toString());
    }
  }, [currentOrg]);

  return (
    <OrganizationContext.Provider
      value={{
        orgs,
        currentOrg,
        setCurrentOrg,
        fetchAndSetUserOrgs,
        refetchOrgs: (): void => setFetchTime(Date.now()),
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};
