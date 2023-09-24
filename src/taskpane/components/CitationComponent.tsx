import { Checkbox } from "@fluentui/react-components";
import { css, StyleSheet } from "aphrodite";
import React from "react";

const CitationComponent = ({ citation, selectedCitations, citationClicked, index }) => {
  return (
    <div className={css(styles.citation)}>
      <Checkbox
        size="medium"
        // className={css(styles.checkbox)}
        // input={{
        //   className: css(styles.checkBoxInput),
        // }}
        checked={selectedCitations[index]}
        onChange={() => citationClicked(index)}
        label={""}
      ></Checkbox>
      <div className={css(styles.citationLabel)} onClick={() => citationClicked(index)}>
        <p className={css(styles.citationTitle)}>{citation.fields.title}</p>
        <p>
          {citation.fields?.author?.map((creator, index) => {
            if (index === 3 && index !== citation.fields?.author?.length - 1) {
              return "... ";
            }
            if (index > 2 && index !== citation.fields?.author?.length - 1) {
              return null;
            }
            return creator.family + " " + creator.given[0] + "., ";
          })}
          {citation.fields.issued && citation.fields.issued["date-parts"][0]}
        </p>
      </div>
    </div>
  );
};

const styles = StyleSheet.create({
  citation: {
    paddingBottom: 8,
    borderBottom: "1px solid #ddd",
    cursor: "pointer",
    display: "flex",
    alignItems: "flex-start",
    paddingTop: 16,
  },
  citationTitle: {
    fontWeight: 700,
    marginTop: 0,
  },
  checkbox: {
    border: "1px solid #ddd",
    marginTop: 2,
    borderRadius: 4,
  },
  checkBoxInput: {
    border: "1px solid #ddd",
    width: "100%",
  },
  citationLabel: {
    // marginLeft: 16,
    textAlign: "left",
  },
});

export default CitationComponent;
