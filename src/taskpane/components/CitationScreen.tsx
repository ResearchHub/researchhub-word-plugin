// @ts-nocheck

import { Input, Checkbox, Button, TabList, Tab, SelectTabEvent, SelectTabData } from "@fluentui/react-components";
import { css, StyleSheet } from "aphrodite";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { fetchCurrentUserReferenceCitations } from "../api/fetchCurrentUserReferenceCitation";
import { useOrgs } from "../Contexts/OrganizationContext";
import { useFolders } from "../Contexts/ActiveFolderContext";
import FolderComponent from "./FolderComponent";

const CitationScreen = () => {
  const [citations, setCitations] = useState([]);
  const [folders, setFolders] = useState([]);
  const [tabHover, setTabHover] = useState("");
  const [fetchingCitations, setFetchingCitations] = useState(false);
  const [selectedCitations, setSelectedCitations] = useState({});
  const [renderedContentControls, setContentControls] = useState({});
  const [activeTab, setActiveTab] = useState("citations");
  const { currentOrg } = useOrgs();
  const { activeFolder, currentOrgFolders, isFetchingFolders } = useFolders();
  const contentControlsById = useRef();
  const allCitationsCited = useRef([]);

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
        console.log(allContentControls.items);
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

        rangeTarget.insertParagraph(``, Word.InsertLocation.end);

        wordContentControl.insertParagraph(bibliography, Word.InsertLocation.end);
        contentControlHandler(wordContentControl);
      }

      await context.sync();
    });
  }

  const createBibliography = (allCitationIndices) => {
    const bibliographyObject = new Cite();
    allCitationIndices.forEach((curIndex) => {
      bibliographyObject.add(citations[curIndex].fields);
    });
    const bibliography = bibliographyObject.format("bibliography", {
      format: "text",
      template: "apa",
      lang: "en-US",
    });

    return bibliography;
  };

  const insertCitation = () => {
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
      template: "apa",
      lang: "en-US",
    });

    addTextAfterSelection(inlineCitation, allSelectedCitations);

    const newBibliography = createBibliography(newCitations);

    addTextToBibliography(newBibliography);

    resetCitations(citations);
  };

  const hasSelectedCitations = useMemo(() => {
    return Object.entries(selectedCitations).filter((entry) => entry[1]).length > 0;
  }, [selectedCitations]);

  const foldersToRender = activeFolder ? activeFolder.children : currentOrgFolders;

  console.log(tabHover);

  return (
    <div className={css(styles.container)}>
      <div>
        <Input placeholder={"Search for a citation"} className={css(styles.input)} />
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
      </TabList>
      {activeTab === "citations" &&
        !fetchingCitations &&
        citations.map((citation, index) => {
          return (
            <>
              <div key={`citation-${index}`} className={css(styles.citation)}>
                <Checkbox
                  size="large"
                  className={css(styles.checkbox)}
                  input={{
                    className: css(styles.checkBoxInput),
                  }}
                  checked={selectedCitations[index]}
                  onChange={() => citationClicked(index)}
                  label={""}
                ></Checkbox>
                <div className={css(styles.citationLabel)} onClick={() => citationClicked(index)}>
                  <p className={css(styles.citationTitle)}>{citation.fields.title}</p>
                  <p>
                    {citation.fields.creators.map((creator, index) => {
                      if (index === 3 && index !== citation.fields.creators.length - 1) {
                        return "... ";
                      }
                      if (index > 2 && index !== citation.fields.creators.length - 1) {
                        return null;
                      }
                      return creator.first_name + " " + creator.last_name[0] + "., ";
                    })}
                    {citation.fields.date.split("-")[0]}
                  </p>
                </div>
              </div>
            </>
          );
        })}

      {activeTab === "folders" &&
        !fetchingCitations &&
        !isFetchingFolders &&
        foldersToRender.map((folder, index) => {
          return (
            <div key={index}>
              <FolderComponent folder={folder} />
            </div>
          );
        })}
      {hasSelectedCitations && (
        <div className={css(styles.bottomDrawer)}>
          <Button className={css(styles.button)} onClick={insertCitation}>
            Insert Citation
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
  },
  checkBoxInput: {
    border: "1px solid #ddd",
  },
  citationLabel: {
    marginLeft: 16,
    textAlign: "left",
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
    paddingTop: 16,
    gap: 16,
    paddingBottom: 16,
  },
  tab: {
    fontSize: 16,
  },
  inactiveHover: {
    ":after": {
      content: "''",
      backgroundColor: "#ddd",
      position: "absolute",
      height: 3,
      width: "100%",
      top: 24,
    },
  },
  activeTab: {
    fontWeight: "bold",
    ":after": {
      content: "''",
      backgroundColor: "rgb(17, 94, 163)",
      position: "absolute",
      height: 3,
      width: "100%",
      top: 24,
    },
  },
});

export default CitationScreen;
