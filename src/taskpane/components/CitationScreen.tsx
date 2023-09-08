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

const CITED_JSON_KEY = "cited-json";

const CitationScreen = ({ setIsLoggedIn }) => {
  const [citations, setCitations] = useState([]);
  const [folders, setFolders] = useState([]);
  const [tabHover, setTabHover] = useState("");
  const [fetchingCitations, setFetchingCitations] = useState(false);
  const [selectedCitations, setSelectedCitations] = useState({});
  const [renderedContentControls, setContentControls] = useState({});
  const [citationStyle, setCitationStyle] = useState(window.localStorage.getItem("citation-style") || "apa");
  const [activeTab, setActiveTab] = useState("citations");
  const [loadingCitation, setLoadingCitation] = useState(false);
  const { currentOrg } = useOrgs();
  const { activeFolder, currentOrgFolders, isFetchingFolders } = useFolders();
  const contentControlsById = useRef();
  const allCitationsCited = useRef([]);
  const citationSearchTimeout = useRef();

  const citationObject = useRef(new Cite());
  const alreadyCited = useRef([]);

  const insertCitationRef = useRef(false);

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

  useEffect(() => {
    // Initialize our citation object with all the citations we have
    const storedJson = window.localStorage.getItem(CITED_JSON_KEY);
    if (storedJson) {
      const storedArr = JSON.parse(storedJson);
      storedArr.forEach((json) => {
        citationObject.current.add(json);
        alreadyCited.current.push(json.id);
      });
    }

    const contentControls = window.localStorage.getItem("content-control-by-id");

    if (contentControls) {
      contentControlsById.current = JSON.parse(contentControls);
      window.contentControlsById = contentControlsById.current;
    }
  }, []);

  async function contentControlAdded(event: Word.ContentControlAddedEventArgs) {
    if (!insertCitationRef.current) {
      await Word.run(async (context) => {
        // Load the title property
        await context.sync();

        console.log(`${event.eventType} event detected. IDs of content controls that were added:`);
        console.log(event.ids);
        try {
          await rebalanceCitationsAfterReordering();
        } catch (e) {
          console.log(e);
        }
      });
    } else {
      insertCitationRef.current = false;
    }
  }

  async function contentControlDataChanged(event: Word.ContentControlDataChangedEventArgs) {
    await Word.run(async (context) => {
      console.log(`${event.eventType} event detected. IDs of content controls where data was changed:`);
      console.log(event.ids);
    });
  }

  async function rebalanceCitationsAfterReordering() {
    await Word.run(async (context) => {
      var contentControls = context.document.contentControls;

      // Load the id property of each content control.
      contentControls.load("id,title,tag");

      await context.sync();

      alreadyCited.current = [];

      const newCitationData = [];
      const idOrder = [];
      const currentIds = citationObject.current.getIds();

      for (let i = 0; i < contentControls.items.length; i++) {
        const contentControl = contentControls.items[i];
        if (contentControl.title === "Citation") {
          const entryId = contentControl.tag;
          alreadyCited.current.push(entryId);

          let newCitationObject = null;
          const entryIdIndex = currentIds.indexOf(entryId);

          if (entryIdIndex < 0) {
            const json = Cite.input(entryId);
            json[0].id = entryId;
            newCitationObject = json[0];
          } else {
            const curCitationObject = citationObject.current.data;
            newCitationObject = curCitationObject[entryIdIndex];
          }

          if (citationObject) {
            newCitationData.push(newCitationObject);
            idOrder.push(newCitationObject.id);
          }
        }
      }

      citationObject.current.set(newCitationData);

      for (let i = 0; i < contentControls.items.length; i++) {
        const contentControl = contentControls.items[i];
        if (contentControl.title === "Citation") {
          const entryId = contentControl.tag;
          const alreadyCitedIndex = alreadyCited.current.indexOf(entryId);

          const text = citationObject.current.format("citation", {
            format: "text",
            template: citationStyle,
            lang: "en-US",
            entry: [entryId],
            citationsPre: alreadyCited.current.slice(0, alreadyCitedIndex),
          });

          contentControl.insertText(`${text}`, Word.InsertLocation.replace);
        }
      }
      await context.sync();
      let resetBibliography = false;

      for (let i = 0; i < currentIds.length; i++) {
        if (currentIds[i] !== idOrder[i]) {
          resetBibliography = true;
          break;
        }
      }

      if (resetBibliography) {
        const newBibliography = createBibliography();

        addTextToBibliography(newBibliography);
      }
    });
  }

  async function rebalanceCitations() {
    await Word.run(async (context) => {
      var contentControls = context.document.contentControls;

      // Load the title property of each content control.
      contentControls.load("id");

      await context.sync();

      for (let i = 0; i < contentControls.items.length; i++) {
        const contentControl = contentControls.items[i];
        if (contentControlsById.current[contentControl.id]) {
          const entryId = contentControlsById.current[contentControl.id].entryId;
          const alreadyCitedIndex = alreadyCited.current.indexOf(entryId);

          const text = citationObject.current.format("citation", {
            format: "text",
            template: citationStyle,
            lang: "en-US",
            entry: [entryId],
            citationsPre: alreadyCited.current.slice(0, alreadyCitedIndex),
          });

          contentControl.insertText(`${text}`, Word.InsertLocation.replace);
        }
      }
      await context.sync();
    });
  }

  async function contentControlDeleted(event: Word.ContentControlDeletedEventArgs) {
    await Word.run(async (context) => {
      console.log("IN CONTENT CONTROL DELETED");
      // First get the count of citations with that citation id
      // If there are more than 1 citation with the same citation id, that means we
      // Don't delete the item from the bibliography if this item gets deleted
      const toRemoveCount = {};

      Object.keys(contentControlsById.current).forEach((eventId) => {
        const entryId = contentControlsById.current[eventId].entryId;
        if (toRemoveCount[entryId]) {
          toRemoveCount[entryId] += 1;
        } else {
          toRemoveCount[entryId] = 1;
        }
      });

      const toRemove = {};
      event.ids.forEach((eventId) => {
        const curCitationControl = contentControlsById.current[eventId];
        if (curCitationControl && toRemoveCount[curCitationControl.entryId] === 1) {
          toRemove[curCitationControl.entryId] = true;
        }
        delete contentControlsById.current[eventId];
      });

      window.localStorage.setItem("content-control-by-id", JSON.stringify({ ...contentControlsById.current }));

      const toKeep = [];

      citationObject.current.data.forEach((citationObjectData) => {
        if (!toRemove[citationObjectData.id]) {
          toKeep.push(citationObjectData);
        }
      });

      alreadyCited.current = alreadyCited.current.filter((entryId) => {
        return !toRemove[entryId];
      });

      citationObject.current.set(toKeep);

      window.localStorage.setItem(CITED_JSON_KEY, JSON.stringify(citationObject.current.data));

      try {
        await rebalanceCitations();
      } catch (e) {
        console.log(e);
      }

      const newBibliography = createBibliography();

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
    console.log("Added event handler for data change and delete.");
    await Word.run(async (context) => {
      const eventContext = context.document.onContentControlAdded.add(contentControlAdded);
      await context.sync();

      console.log("Added event handler for when content controls are added.");
    });
  }

  async function insertTextWithNewLines(text, insertElement, location) {
    const paragraphs = text.split("\n");
    await Word.run(function (context) {
      let currentRange = insertElement;
      paragraphs.forEach(function (paragraphText, index) {
        // For the first paragraph, we use the location parameter
        // For subsequent paragraphs, we always insert after to ensure the order
        const insertLocation = index === 0 ? location : Word.InsertLocation.end;

        const newParagraph = insertElement.insertParagraph(paragraphText, insertLocation);
        newParagraph.font.color = "black";

        // Load the properties you're going to interact with
        newParagraph.load("font");

        if (index === 0 && location === Word.InsertLocation.after) {
          // Move the range to the end of the inserted paragraph
          currentRange = currentRange.getNextSiblingOrNullObject();
          context.load(currentRange);
        }
      });

      return context.sync().then(function () {
        console.log("Inserted multiple bibliography.");
      });
    });
  }

  async function addTextAfterSelection(text, allSelectedCitations, entryId) {
    await Word.run(async (context) => {
      // Create a proxy object for the document.
      var doc = context.document;

      // Queue a command to get the current selection and then create a proxy range object with the results.
      var range = doc.getSelection();
      const rangeTarget = range.getRange("End");
      const wordContentControl = rangeTarget.insertContentControl();
      wordContentControl.tag = entryId;
      wordContentControl.title = "Citation";
      wordContentControl.cannotEdit = false;
      wordContentControl.appearance = "BoundingBox";

      const newContentControlsById = { ...contentControlsById.current };
      const contentControls = context.document.contentControls;

      range.insertText(` `, Word.InsertLocation.end);
      // Queue a command to insert text at the end of the selection.
      wordContentControl.insertText(`${text}`, Word.InsertLocation.end);
      range.insertText(` `, Word.InsertLocation.end);

      // Queue a command to load the id property for all of content controls.
      contentControls.load("id");
      contentControls.load("text");

      // Synchronize the document state by executing the queued commands,
      // and return a promise to indicate task completion.
      await context.sync();

      newContentControlsById[wordContentControl.id] = {
        contentControl: wordContentControl,
        allSelectedCitations,
        entryId,
      };
      contentControlsById.current = newContentControlsById;
      window.localStorage.setItem("content-control-by-id", JSON.stringify({ ...contentControlsById.current }));
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
      contentControls.load("tag");

      // Synchronize the document state by executing the queued commands,
      // and return a promise to indicate task completion.

      await context.sync();

      try {
        contentControls.items.forEach((contentControlItem) => {
          if (contentControlItem.tag === "bibliography") {
            bibliographyExists = true;
            bibliographyControls = contentControlItem;
          }
        });
      } catch (e) {
        console.log(e);
      }

      const range = context.document.body.getRange("Content");
      const rangeTarget = range.getRange("End");

      if (bibliographyExists) {
        const paragraph = bibliographyControls.insertText("Bibliography", Word.InsertLocation.replace);
        paragraph.font.color = "blue";

        // Load the properties you're going to interact with
        paragraph.load("font");

        insertTextWithNewLines(bibliography, bibliographyControls, Word.InsertLocation.end);
      } else {
        const wordContentControl = rangeTarget.insertContentControl();
        wordContentControl.tag = "bibliography";
        wordContentControl.title = "Bibliography";
        wordContentControl.cannotEdit = false;
        wordContentControl.appearance = "BoundingBox";
        const paragraph = wordContentControl.insertText("Bibliography", Word.InsertLocation.end);
        paragraph.font.color = "blue";

        // Load the properties you're going to interact with
        paragraph.load("font");

        insertTextWithNewLines(bibliography, wordContentControl, Word.InsertLocation.end);

        contentControlHandler(wordContentControl);
      }

      await context.sync();
    });
  }

  const createBibliography = () => {
    const bibliography = citationObject.current.format("bibliography", {
      format: "text",
      template: citationStyle,
      lang: "en-US",
    });

    return bibliography;
  };

  const insertCitation = () => {
    setLoadingCitation(true);
    insertCitationRef.current = true;
    const allSelectedCitations = Object.entries(selectedCitations).filter((entry) => entry[1]);
    let entryId = null;
    // @ts-ignore
    const newCitations = [...allCitationsCited.current];
    for (let i = 0; i < allSelectedCitations.length; i++) {
      const selectedCitationIndex = parseInt(allSelectedCitations[i][0], 10);
      newCitations.push(selectedCitationIndex);
      const doiWithoutUrl = citations[selectedCitationIndex].fields.DOI.split("https://doi.org/")[1];
      const json = Cite.input(doiWithoutUrl);
      json[0].id = doiWithoutUrl;
      entryId = doiWithoutUrl;
      if (citationObject.current.getIds().indexOf(entryId) < 0) {
        citationObject.current.add(json);
      }
    }

    allCitationsCited.current = newCitations;

    window.localStorage.setItem(CITED_JSON_KEY, JSON.stringify(citationObject.current.data));
    const inlineCitation = citationObject.current.format("citation", {
      format: "text",
      template: citationStyle,
      lang: "en-US",
      entry: [entryId],
      citationsPre: alreadyCited.current,
    });

    addTextAfterSelection(inlineCitation, allSelectedCitations, entryId);
    alreadyCited.current.push(entryId);

    const newBibliography = createBibliography(citationObject);

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
          <Settings setCitationStyle={setCitationStyle} citationStyle={citationStyle} setIsLoggedIn={setIsLoggedIn} />
        </div>
      )}

      {hasSelectedCitations && (
        <div className={css(styles.bottomDrawer)}>
          <Button className={css(styles.button)} onClick={insertCitation}>
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
