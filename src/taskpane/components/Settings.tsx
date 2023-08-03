import React, { useState } from "react";
import { Icon } from "@fluentui/react/lib/Icon";
import { StyleSheet, css } from "aphrodite";
import { Radio, RadioGroup, useId } from "@fluentui/react-components";

const Settings = ({ setCitationStyle, citationStyle }) => {
  const radioName = useId("radio");
  const labelId = useId("label");

  const citationStyleChanged = (_, data) => {
    setCitationStyle(data.value);
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
    </div>
  );
};

export default Settings;

const styles = StyleSheet.create({
  label: {
    fontSize: 18,
    fontWeight: 500,
  },
});
