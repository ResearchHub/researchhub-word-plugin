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
  setActiveFolder: (proj: ProjectValue) => void;
  setCurrentOrgFolders: (folders: ProjectValue[]) => void;
  setIsFetchingFolders: (bool: boolean) => void;
};

export const DEFAULT_VALUE = {
  activeFolder: null,
  currentOrgFolders: [],
  isFetchingFolders: false,
  setActiveFolder: () => {},
  setCurrentOrgFolders: () => {},
  setIsFetchingFolders: () => {},
};

export const ReferenceActiveProjectContext: Context<ReferenceActiveProjectContextValueType> =
  createContext<ReferenceActiveProjectContextValueType>(DEFAULT_VALUE);

export const useFolders = (): ReferenceActiveProjectContextValueType => {
  return useContext(ReferenceActiveProjectContext);
};

export function ActiveFolderContext({ children }) {
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
