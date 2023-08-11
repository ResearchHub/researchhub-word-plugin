// @ts-nocheck

import { Input, Button, TabList, Tab, SelectTabEvent, SelectTabData } from "@fluentui/react-components";
import { Icon } from "@fluentui/react/lib/Icon";
import { css, StyleSheet } from "aphrodite";
import React, { useState, useEffect, useMemo, useRef, SyntheticEvent } from "react";
import ReactPlaceholder from "react-placeholder";
import "react-placeholder/lib/reactPlaceholder.css";

import { fetchCurrentUserReferenceCitations } from "../api/fetchCurrentUserReferenceCitation";
import { useOrgs } from "../Contexts/OrganizationContext";
import { useFolders } from "../Contexts/ActiveFolderContext";
import FolderComponent from "./FolderComponent";
import CitationComponent from "./CitationComponent";
import Settings from "./Settings";
import { RectShape } from "react-placeholder/lib/placeholders";
import { GET_CONFIG, generateApiUrl } from "../../../api/api";

import ieee from "../../../assets/csl_styles/ieee.csl";
import nature from "../../../assets/csl_styles/nature.csl";
import { Spinner } from "@fluentui/react";

const CitationScreen = () => {
  const [citations, setCitations] = useState([]);
  const [folders, setFolders] = useState([]);
  const [tabHover, setTabHover] = useState("");
  const [fetchingCitations, setFetchingCitations] = useState(false);
  const [selectedCitations, setSelectedCitations] = useState({});
  const [renderedContentControls, setContentControls] = useState({});
  const [citationStyle, setCitationStyle] = useState("apa");
  const [activeTab, setActiveTab] = useState("citations");
  const [loadingCitation, setLoadingCitation] = useState(false);
  const { currentOrg } = useOrgs();
  const { activeFolder, currentOrgFolders, isFetchingFolders } = useFolders();
  const contentControlsById = useRef();
  const allCitationsCited = useRef([]);
  const citationSearchTimeout = useRef();

  const onTabSelect = (event: SelectTabEvent, data: SelectTabData) => {
    setActiveTab(data.value);
  };

  const resetCitations = (citationList) => {
    const newCitations = {};

    citationList.forEach((_, index) => {
      newCitations[index] = false;
    });

    setSelectedCitations(newCitations);
  };

  function addCslStyle(name, file) {
    Cite.CSL.register.addTemplate(name, file);
    // const json = resp.json();
    // return Cite.util
    //   .fetchFileAsync(`https://zotero.org/styles/${name}`)
    //   .then((xml) => Cite.CSL.register.addTemplate(name, xml));
  }

  useEffect(() => {
    addCslStyle("ieee", ieee);
    addCslStyle("nature", nature);
  }, []);

  async function contentControlDataChanged(event: Word.ContentControlDataChangedEventArgs) {
    await Word.run(async (context) => {
      console.log(`${event.eventType} event detected. IDs of content controls where data was changed:`);
      console.log(event.ids);
    });
  }

  async function contentControlDeleted(event: Word.ContentControlDeletedEventArgs) {
    await Word.run(async (context) => {
      const newCitationsCited = [...allCitationsCited.current];
      event.ids.forEach((eventId) => {
        const curCitationControl = contentControlsById.current[eventId];
        if (curCitationControl) {
          const toRemove = [];
          curCitationControl.allSelectedCitations.forEach((citationIndex) => {
            const removeIndex = newCitationsCited.indexOf(parseInt(citationIndex[0], 10));
            if (removeIndex > -1) {
              toRemove.push(removeIndex);
            }
          });

          toRemove.forEach((indexToRemove) => {
            newCitationsCited.splice(indexToRemove, 1);
          });
        }
      });

      allCitationsCited.current = newCitationsCited;
      const newBibliography = createBibliography(newCitationsCited);

      addTextToBibliography(newBibliography);
    });
  }

  useEffect(() => {
    const initializeContentControls = async () => {
      await Word.run(async (context) => {
        const allContentControls = context.document.body.contentControls;
        allContentControls.items.forEach((controlItem) => {
          contentControlHandler(controlItem);
        });
        await context.sync();

        setContentControls(allContentControls);
      });
    };
    initializeContentControls();
  }, []);

  useEffect(() => {
    const getCitations = async () => {
      setFetchingCitations(true);
      const citations = await fetchCurrentUserReferenceCitations({
        getCurrentUserCitation: true,
        organizationID: currentOrg.id,
        projectID: activeFolder?.projectID,
      });

      setFetchingCitations(false);

      resetCitations(citations);

      setCitations(citations);
    };

    if (currentOrg.id) {
      getCitations();
    }
  }, [currentOrg.id]);

  const citationClicked = (index) => {
    const newCitations = { ...selectedCitations };
    newCitations[index] = !newCitations[index];
    setSelectedCitations(newCitations);
  };

  async function contentControlHandler(contentControlItem) {
    contentControlItem.onDataChanged.add(contentControlDataChanged);
    contentControlItem.onDeleted.add(contentControlDeleted);
    contentControlItem.track();
  }

  async function addTextAfterSelection(text, allSelectedCitations) {
    await Word.run(async (context) => {
      // Create a proxy object for the document.
      var doc = context.document;

      // Queue a command to get the current selection and then create a proxy range object with the results.
      var range = doc.getSelection();
      const rangeTarget = range.getRange("End");
      const wordContentControl = rangeTarget.insertContentControl();
      wordContentControl.tag = "citation";
      wordContentControl.title = "Citation";
      wordContentControl.cannotEdit = false;
      wordContentControl.appearance = "BoundingBox";

      const newContentControlsById = { ...contentControlsById.current };
      const contentControls = context.document.contentControls;

      // Queue a command to insert text at the end of the selection.
      wordContentControl.insertText(` ${text}`, Word.InsertLocation.end);
      range.insertText(` `, Word.InsertLocation.end);

      // Queue a command to load the id property for all of content controls.
      contentControls.load("id");
      contentControls.load("text");

      // Synchronize the document state by executing the queued commands,
      // and return a promise to indicate task completion.
      await context.sync();

      newContentControlsById[wordContentControl.id] = { contentControl: wordContentControl, allSelectedCitations };
      contentControlsById.current = newContentControlsById;
      contentControlHandler(wordContentControl);

      // Synchronize the document state by executing the queued commands,
      // and return a promise to indicate task completion.
      return context.sync().then(function () {
        console.log("Text added after the selection.");
      });
    }).catch(function (error) {
      console.log("Error: " + JSON.stringify(error));
      if (error instanceof OfficeExtension.Error) {
        console.log("Debug info: " + JSON.stringify(error.debugInfo));
      }
    });
  }

  async function addTextToBibliography(bibliography) {
    await Word.run(async (context) => {
      /**
       * Insert your Word code here
       */

      let bibliographyExists = false;
      let bibliographyControls = null;
      const contentControls = context.document.contentControls;
      // Queue a command to load the id property for all of the content controls.
      contentControls.load();

      // Synchronize the document state by executing the queued commands,
      // and return a promise to indicate task completion.
      await context.sync();

      contentControls.items.forEach((contentControlItem) => {
        if (contentControlItem.tag === "bibliography") {
          bibliographyExists = true;
          bibliographyControls = contentControlItem;
        }
      });

      const range = context.document.body.getRange("Content");
      const rangeTarget = range.getRange("End");

      if (bibliographyExists) {
        bibliographyControls.insertText(`\n ${bibliography}`, Word.InsertLocation.replace);
      } else {
        const wordContentControl = rangeTarget.insertContentControl();
        wordContentControl.tag = "bibliography";
        wordContentControl.title = "Bibliography";
        wordContentControl.cannotEdit = false;
        wordContentControl.appearance = "BoundingBox";
        wordContentControl.insertText(bibliography, Word.InsertLocation.end);
        contentControlHandler(wordContentControl);
      }

      await context.sync();
    });
  }

  const createBibliography = (allCitationIndices) => {
    const bibliographyObject = new Cite();
    allCitationIndices.forEach((curIndex) => {
      const json = Cite.input(citations[curIndex].fields.DOI.split("https://doi.org/")[1]);

      bibliographyObject.add(json);
    });
    const bibliography = bibliographyObject.format("bibliography", {
      format: "text",
      template: citationStyle,
      lang: "en-US",
    });

    return bibliography;
  };

  const insertCitation = () => {
    setLoadingCitation(true);
    const allSelectedCitations = Object.entries(selectedCitations).filter((entry) => entry[1]);
    // @ts-ignore
    const citationObject = new Cite();
    const newCitations = [...allCitationsCited.current];
    for (let i = 0; i < allSelectedCitations.length; i++) {
      const selectedCitationIndex = parseInt(allSelectedCitations[i][0], 10);
      newCitations.push(selectedCitationIndex);
      citationObject.add(citations[selectedCitationIndex].fields);
    }

    allCitationsCited.current = newCitations;

    const inlineCitation = citationObject.format("citation", {
      format: "text",
      template: citationStyle,
      lang: "en-US",
    });

    addTextAfterSelection(inlineCitation, allSelectedCitations);

    const newBibliography = createBibliography(newCitations);

    addTextToBibliography(newBibliography);

    resetCitations(citations);
    setLoadingCitation(false);
  };

  const hasSelectedCitations = useMemo(() => {
    return Object.entries(selectedCitations).filter((entry) => entry[1]).length > 0;
  }, [selectedCitations]);

  const foldersToRender = activeFolder ? activeFolder.children : currentOrgFolders;

  const searchForCitation = async (e: SyntheticEvent) => {
    const searchQuery = e.target.value;
    if (searchQuery) {
      const url = generateApiUrl(`search/citation`, `?search=${searchQuery}`);
      setFetchingCitations(true);
      clearTimeout(citationSearchTimeout.current);
      citationSearchTimeout.current = setTimeout(() => {
        fetchCitationsWithQuery(url);
      }, 300);
    } else {
      const citations = await fetchCurrentUserReferenceCitations({
        getCurrentUserCitation: true,
        organizationID: currentOrg.id,
        projectID: activeFolder?.projectID,
      });

      setFetchingCitations(false);

      resetCitations(citations);

      setCitations(citations);
    }
  };

  const fetchCitationsWithQuery = async (url) => {
    const config = GET_CONFIG({});
    config.headers["X-organization-id"] = currentOrg.id.toString();
    const resp = await fetch(url, config);
    const json = await resp.json();
    setFetchingCitations(false);
    const citations = json.results;
    setCitations(citations);
    resetCitations(citations);
  };

  return (
    <div className={css(styles.container)}>
      <div className={css(styles.searchContainer)}>
        <Input
          placeholder={"Search for a citation"}
          className={css(styles.input)}
          onChange={searchForCitation}
          contentAfter={<Icon iconName={"Search"} className={css(styles.searchIcon)} />}
        />
      </div>
      <TabList
        selectedValue={activeTab}
        onTabSelect={onTabSelect}
        defaultSelectedValue={"citations"}
        className={css(styles.tabContainer)}
      >
        <Tab
          onMouseEnter={() => setTabHover("citations")}
          onMouseLeave={() => setTabHover("")}
          className={css(
            styles.tab,
            tabHover === "citations" && styles.inactiveHover,
            activeTab === "citations" && styles.activeTab
          )}
          value="citations"
        >
          Citations
        </Tab>
        <Tab
          onMouseEnter={() => setTabHover("folders")}
          onMouseLeave={() => setTabHover("")}
          className={css(
            styles.tab,
            tabHover === "folders" && styles.inactiveHover,
            activeTab === "folders" && styles.activeTab
          )}
          value="folders"
        >
          Folders
        </Tab>
        <Tab value="settings" style={{ marginTop: 4, marginLeft: "auto", fontSize: 14 }}>
          <Icon iconName="Settings" />
        </Tab>
      </TabList>
      <ReactPlaceholder
        className={css(styles.placeholderContainer)}
        ready={!fetchingCitations && !isFetchingFolders}
        // type={"textRow"}
        showLoadingAnimation
        customPlaceholder={Placeholder}
        // rows={100}
      >
        <div>
          {activeTab === "citations" &&
            !fetchingCitations &&
            citations.map((citation, index) => {
              return (
                <div key={index}>
                  <CitationComponent
                    citation={citation}
                    selectedCitations={selectedCitations}
                    citationClicked={citationClicked}
                    index={index}
                  />
                </div>
              );
            })}

          {activeTab === "folders" &&
            !fetchingCitations &&
            !isFetchingFolders &&
            foldersToRender.map((folder, index) => {
              return (
                <div key={index}>
                  <FolderComponent
                    folder={folder}
                    citations={citations}
                    selectedCitations={selectedCitations}
                    citationClicked={citationClicked}
                  />
                </div>
              );
            })}
        </div>
      </ReactPlaceholder>
      {activeTab === "settings" && (
        <div>
          <Settings setCitationStyle={setCitationStyle} citationStyle={citationStyle} />
        </div>
      )}

      {hasSelectedCitations && (
        <div className={css(styles.bottomDrawer)}>
          <Button disabled={loadingCitation} className={css(styles.button)} onClick={insertCitation}>
            {loadingCitation ? <Spinner /> : "Insert Citation"}
          </Button>
        </div>
      )}
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  input: {
    border: "1px solid #ddd",
    width: "100%",
    padding: "8px 16px",
    borderRadius: 4,
  },
  bottomDrawer: {
    position: "fixed",
    bottom: 0,
    left: 0,
    height: 80,
    width: "100%",
    background: "#fff",
    boxShadow: "0px -2px 8px 0px rgba(0,0,0,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    // width: "100%",
    margin: "auto",
    background: "rgb(57, 113, 255)",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
  },
  tabContainer: {
    paddingTop: 10,
    gap: 16,
    paddingBottom: 16,
  },
  searchContainer: {
    position: "relative",
  },
  placeholderContainer: {
    width: "100%",
    paddingTop: 8,
    paddingBottom: 8,
    height: 56,
  },
  placeholderParent: {
    paddingTop: 16,
    paddingBottom: 16,
    borderBottom: "1px solid #ddd",
  },
  searchIcon: {},
});
const Placeholder = (
  <div style={{ height: "100%", width: "100%" }}>
    {new Array(6).fill(0).map((_, index) => {
      return (
        <div key={index} className={css(styles.placeholderParent)}>
          <RectShape className={css(styles.placeholderContainer)} color="#EFEFEF" />
        </div>
      );
    })}
  </div>
);

export default CitationScreen;
