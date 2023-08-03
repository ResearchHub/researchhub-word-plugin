// @ts-nocheck

import App from "./components/App";
import { AppContainer } from "react-hot-loader";
import { initializeIcons } from "@fluentui/font-icons-mdl2";
import { ThemeProvider } from "@fluentui/react";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Authenticator } from "@microsoft/office-js-helpers";
import { FluentProvider, createDarkTheme, createLightTheme } from "@fluentui/react-components";
import type { BrandVariants, Theme } from "@fluentui/react-components";

const researchhub: BrandVariants = {
  10: "#020206",
  20: "#121629",
  30: "#182349",
  40: "#1B2E64",
  50: "#1D3981",
  60: "#1E449E",
  70: "#2050BB",
  80: "#245DD8",
  90: "#2E69F3",
  100: "#4B77FF",
  110: "#6B85FF",
  120: "#8494FF",
  130: "#9AA3FF",
  140: "#AEB3FF",
  150: "#C1C3FF",
  160: "#D3D3FF",
};

const lightTheme: Theme = {
  ...createLightTheme(researchhub),
};

const darkTheme: Theme = {
  ...createDarkTheme(researchhub),
};

darkTheme.colorBrandForeground1 = researchhub[110];
darkTheme.colorBrandForeground2 = researchhub[120];
/* global document, Office, module, require */

initializeIcons();

let isOfficeInitialized = false;

const title = "ResearchHub Add In";

var authenticator = new Authenticator();
const GOOGLE_CLIENT_ID = "192509748493-uuidcme05mco3k32188n8qvih89j46jd.apps.googleusercontent.com";
// register Google endpoint using
authenticator.endpoints.registerGoogleAuth(GOOGLE_CLIENT_ID, {
  redirectUrl: "https://localhost:3000/taskpane.html",
});

const render = (Component) => {
  ReactDOM.render(
    <AppContainer>
      <ThemeProvider>
        <FluentProvider theme={lightTheme}>
          <Component title={title} isOfficeInitialized={isOfficeInitialized} authenticator={authenticator} />
        </FluentProvider>
      </ThemeProvider>
    </AppContainer>,
    document.getElementById("container")
  );
};

/* Render application after Office initializes */
Office.onReady(() => {
  isOfficeInitialized = true;
  if (OfficeHelpers.Authenticator.isAuthDialog()) {
    return window.location.href;
  }

  render(App);
});

if ((module as any).hot) {
  (module as any).hot.accept("./components/App", () => {
    const NextApp = require("./components/App").default;
    render(NextApp);
  });
}
