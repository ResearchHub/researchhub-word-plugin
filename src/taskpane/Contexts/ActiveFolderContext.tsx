// @ts-nocheck

import React, { Context, createContext, useContext, useEffect, useState } from "react";
// import { emptyFncWithMsg, isEmpty, isNullOrUndefined, silentEmptyFnc } from "~/config/utils/nullchecks";
// import { NullableString } from "~/config/types/root_types";
import { fetchReferenceOrgProjects } from "../api/fetchCurrentUserReferenceCitation";
import { useOrgs } from "./OrganizationContext";

export type ProjectValue = {
  children: ProjectValue[];
  collaborators: [];
  isPublic: boolean;
  projectID: number;
  projectName: string;
};

export type ReferenceActiveProjectContextValueType = {
  activeFolder: ProjectValue | null;
  currentOrgFolders: ProjectValue[];
  isFetchingFolders: boolean;
  setActiveFolder: (proj: ProjectValue | undefined) => void;
  setCurrentOrgFolders: (folders: ProjectValue[] | undefined) => void;
  setIsFetchingFolders: (bool: boolean | undefined) => void;
};

export const DEFAULT_VALUE = {
  activeFolder: null,
  currentOrgFolders: [],
  isFetchingFolders: false,
  setActiveFolder: () => {},
  setCurrentOrgFolders: () => {},
  setIsFetchingFolders: () => {},
};

export const ActiveFolderContext: Context<ReferenceActiveProjectContextValueType> =
  createContext<ReferenceActiveProjectContextValueType>(DEFAULT_VALUE);

export const useFolders = (): ReferenceActiveProjectContextValueType => {
  return useContext(ActiveFolderContext);
};

// eslint-disable-next-line react/prop-types
export function ActiveFolderContextProvider({ children }) {
  const [activeFolder, setActiveFolder] = useState<ProjectValue | null>(null);
  const [currentOrgFolders, setCurrentOrgFolders] = useState<ProjectValue[]>([]);
  const [isFetchingFolders, setIsFetchingFolders] = useState<boolean>(true);

  const { currentOrg } = useOrgs();
  const orgID = currentOrg?.id;

  // Initialize
  useEffect((): void => {
    const fetchFolders = async () => {
      if (orgID) {
        setIsFetchingFolders(true);
        const folders = await fetchReferenceOrgProjects({
          payload: {
            organization: orgID,
          },
        });

        setCurrentOrgFolders(folders);
        setIsFetchingFolders(false);
      }
    };

    fetchFolders();
  }, [orgID]);

  return (
    <ActiveFolderContext.Provider
      value={{
        activeFolder,
        currentOrgFolders,
        isFetchingFolders,
        setActiveFolder,
        setCurrentOrgFolders,
        setIsFetchingFolders,
      }}
    >
      {children}
    </ActiveFolderContext.Provider>
  );
}
