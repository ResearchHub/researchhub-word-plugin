// @ts-nocheck
import React, { ReactElement } from "react";
import { StyleSheet, css } from "aphrodite";

const OrgAvatar = ({ org, size = 30, fontSize = 14 }): ReactElement => {
  const getOrgInitials = (org) => {
    return org?.name
      ? org?.name
          .split(" ")
          .map((s) => s.charAt(0).toUpperCase())
          .slice(0, 2)
      : "";
  };

  return (
    <div className={css(styles.container)} style={{ width: size, minWidth: size, height: size, fontSize }}>
      {org?.cover_image ? (
        <img layout="fill" src={org?.cover_image} className={css(styles.image)} />
      ) : (
        <div className={css(styles.initialsContainer)}>
          <div className={css(styles.initials)}>{getOrgInitials(org)}</div>
        </div>
      )}
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    color: "black",
  },
  initialsContainer: {
    height: "100%",
    borderRadius: "100px",
    background: "#FBFBFD",
    border: "1px solid #E5E5F0",
    color: "#7C7989",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  initials: {},
});

export default OrgAvatar;
