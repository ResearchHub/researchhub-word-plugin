import * as React from "react";
import Progress from "./Progress";
import LoginScreen from "./LoginScreen";
import { RESEARCHHUB_AUTH_TOKEN } from "../../../api/api";
import CitationScreen from "./CitationScreen";
import { OrganizationContextProvider } from "../Contexts/OrganizationContext";
import { ActiveFolderContextProvider } from "../Contexts/ActiveFolderContext";
// import GoogleIcon from "~/assets/google.png";
/* global Word, require */

export interface AppProps {
  title: string;
  authenticator: any;
  isOfficeInitialized: boolean;
}

export interface AppState {}

const App = ({ authenticator }) => {
  const [isLoggedIn, setIsLoggedIn] = React.useState<boolean>(false);
  const [whichScreen, setWhichScreen] = React.useState<string>("citation-screen");

  React.useEffect(() => {
    if (window.localStorage.getItem(RESEARCHHUB_AUTH_TOKEN)) {
      setIsLoggedIn(true);
    }
  }, []);

  // React.useEffect(() => {
  //   if (window.location.href.includes("access_token")) {

  //   }
  // }, [])

  // if (window.location.href.includes("access_token")) {
  //   return <div></div>;
  // }

  return (
    <OrganizationContextProvider isLoggedIn={isLoggedIn}>
      <ActiveFolderContextProvider>
        <div>
          {isLoggedIn ? (
            <div>
              {whichScreen === "citation-screen" ? <CitationScreen setIsLoggedIn={setIsLoggedIn} /> : <div></div>}
            </div>
          ) : (
            <LoginScreen setIsLoggedIn={setIsLoggedIn} authenticator={authenticator} />
          )}
        </div>
      </ActiveFolderContextProvider>
    </OrganizationContextProvider>
  );
};

export default App;
