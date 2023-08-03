import React, { useState } from "react";
import { Icon } from "@fluentui/react/lib/Icon";
import { StyleSheet, css } from "aphrodite";

const FolderComponent = ({ folder }) => {
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
            <div className={css(styles.innerChildren)}>
              <FolderComponent folder={innerFolder} key={index} />
            </div>
          );
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
    marginLeft: 16,
  },
});
