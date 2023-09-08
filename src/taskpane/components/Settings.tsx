import React, { useState } from "react";
import { Icon } from "@fluentui/react/lib/Icon";
import { StyleSheet, css } from "aphrodite";
import { Button, Radio, RadioGroup, useId } from "@fluentui/react-components";
import { RESEARCHHUB_AUTH_TOKEN } from "../../../api/api";

const Settings = ({ setCitationStyle, citationStyle, setIsLoggedIn }) => {
  const radioName = useId("radio");
  const labelId = useId("label");

  const citationStyleChanged = (_, data) => {
    setCitationStyle(data.value);
    window.localStorage.setItem("citation-style", data.value);
  };

  return (
    <div>
      <label id={labelId} className={css(styles.label)}>
        Reference Style
      </label>
      <RadioGroup onChange={citationStyleChanged} value={citationStyle} role="radiogroup" aria-labelledby={labelId}>
        <Radio name={radioName} value="apa" label="APA" />
        <Radio name={radioName} value="mla" label="MLA" />
        <Radio name={radioName} value="ieee" label="IEEE" />
        <Radio name={radioName} value="nature" label="Nature" />
      </RadioGroup>
      <Button
        className={css(styles.button)}
        onClick={() => {
          window.localStorage.removeItem(RESEARCHHUB_AUTH_TOKEN);
          setIsLoggedIn(false);
        }}
      >
        Sign Out
      </Button>
    </div>
  );
};

export default Settings;

const styles = StyleSheet.create({
  label: {
    fontSize: 18,
    fontWeight: 500,
  },
  button: {
    marginTop: 32,
    width: "100%",
  },
});
