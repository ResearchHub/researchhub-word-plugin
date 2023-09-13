import React, { ReactElement, useState } from "react";
import { StyleSheet, css } from "aphrodite";

// Components
import ResearchHubPopover from "./BasePopover";

// Utils
import OrgAvatar from "./OrgAvatar";

import ReactPlaceholder from "react-placeholder/lib";
import OrgEntryPlaceholder from "./OrgEntryPlaceholder";
import { Icon } from "@fluentui/react/lib/Icon";

// import ManageOrgModal from "~/components/Org/ManageOrgModal";
import { useOrgs } from "../Contexts/OrganizationContext";

export default function OrganizationPopover(): ReactElement {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { orgs, setCurrentOrg, currentOrg } = useOrgs();

  return (
    <div className={css(styles.container)}>
      <ResearchHubPopover
        containerStyle={{
          marginLeft: "10px",
          marginTop: "-10px",
          zIndex: 9999,
        }}
        isOpen={isPopoverOpen}
        popoverContent={
          <div className={css(styles.popoverBodyContent)}>
            <div className={css(styles.userOrgs)}>
              {orgs.map((org) => (
                <div
                  key={org.id.toString()}
                  className={css(styles.popoverBodyItem)}
                  onClick={() => {
                    setCurrentOrg(org);
                    setIsPopoverOpen(!isPopoverOpen);
                  }}
                >
                  <div className={css(styles.avatarWrapper)}>
                    <OrgAvatar org={org} />
                  </div>
                  <div className={css(styles.popoverBodyItemText)}>
                    <div className={css(styles.popoverBodyItemTitle)}>{org.name}</div>
                    <div className={css(styles.popoverBodyItemSubtitle)}>
                      {!org.member_count ? "" : org.member_count === 1 ? "1 member" : `${org.member_count} members`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
        positions={["bottom"]}
        onClickOutside={() => setIsPopoverOpen(false)}
        targetContent={
          <div className={css(styles.popoverTarget)} onClick={() => setIsPopoverOpen(!isPopoverOpen)}>
            <ReactPlaceholder
              ready={!!Object.keys(currentOrg).length}
              showLoadingAnimation
              // @ts-ignore
              customPlaceholder={<OrgEntryPlaceholder color="#EFEFEF" />}
            >
              <div className={css(styles.avatarWrapper)}>
                <OrgAvatar org={currentOrg} />
              </div>
              {currentOrg?.name}
            </ReactPlaceholder>
            <div style={{ marginLeft: "auto" }}>
              <Icon iconName={"ChevronDown"} />
            </div>
          </div>
        }
      />
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 16,
    // border: "1px solid #ddd",
    background: "rgb(249, 249, 252)",
    borderRadius: 4,
    boxSizing: "border-box",
  },
  avatarWrapper: {
    marginRight: 10,
  },
  userOrgs: {
    maxHeight: 300,
    overflowY: "auto",
  },
  popoverTarget: {
    alignItems: "center",
    width: "100%",
    color: "rgba(0, 0, 0, .6)",
    cursor: "pointer",
    display: "flex",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 1.1,
    padding: 16,
    textTransform: "uppercase",
    userSelect: "none",
    wordBreak: "break-word",
    boxSizing: "border-box",
    ":hover": {
      backgroundColor: "rgba(193, 193, 207, .3)",
    },
  },
  popoverBodyContent: {
    backgroundColor: "#fff",
    borderRadius: 4,
    boxShadow: "0px 0px 10px 0px #00000026",
    display: "flex",
    flexDirection: "column",
    userSelect: "none",
    width: 270,
  },
  popoverBodyItem: {
    alignItems: "center",
    cursor: "pointer",
    display: "flex",
    padding: 15,
    textDecoration: "none",
    wordBreak: "break-word",
    ":hover": {
      backgroundColor: "rgba(193, 193, 207, .2)",
    },
    ":first-child": {
      borderRadius: "4px 4px 0px 0px",
    },
  },
  popoverBodyItemText: {
    display: "flex",
    flexDirection: "column",
  },
  popoverBodyItemTitle: {
    color: "#111",
    fontWeight: 500,
  },
  popoverBodyItemSubtitle: {
    color: "rgba(0, 0, 0, .5)",
    fontSize: 13,
    marginTop: 2,
  },
  scrollable: {
    overflow: "auto",
  },
});
