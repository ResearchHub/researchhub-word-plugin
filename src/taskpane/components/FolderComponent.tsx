import React, { useState } from "react";
import { Icon } from "@fluentui/react/lib/Icon";
import { StyleSheet, css } from "aphrodite";
import CitationComponent from "./CitationComponent";

const FolderComponent = ({ folder, citations, selectedCitations, citationClicked }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <div className={css(styles.folderContainer)} onClick={() => setIsOpen(!isOpen)}>
        <Icon iconName={isOpen ? "ChevronUp" : "ChevronDown"} className={css(styles.chevronIcon)} />
        <Icon iconName={"FabricFolderFill"} className={css(styles.folderIcon)} />
        <div> {folder.project_name}</div>
      </div>

      {isOpen &&
        folder.children.map((innerFolder, index) => {
          return (
            <div className={css(styles.innerChildren)} key={index}>
              <FolderComponent
                folder={innerFolder}
                selectedCitations={selectedCitations}
                citationClicked={citationClicked}
                citations={citations}
              />
            </div>
          );
        })}

      {isOpen &&
        citations.map((citation, index) => {
          if (citation.project === folder.id) {
            return (
              <div key={index} className={css(styles.innerChildren)}>
                <CitationComponent
                  citation={citation}
                  selectedCitations={selectedCitations}
                  citationClicked={citationClicked}
                  index={index}
                />
              </div>
            );
          } else {
            return null;
          }
        })}
    </div>
  );
};

export default FolderComponent;

const styles = StyleSheet.create({
  folderContainer: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    borderBottom: "1px solid #ddd",
    padding: "12px 0px",
  },
  chevronIcon: {
    marginRight: 12,
    fontSize: 10,
  },
  folderIcon: {
    marginRight: 8,
    color: "#7BD3F9",
  },
  innerChildren: {
    paddingLeft: 16,
  },
});
