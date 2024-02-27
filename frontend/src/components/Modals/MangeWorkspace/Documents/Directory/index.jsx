import UploadFile from "../UploadFile";
import PreLoader from "@/components/Preloader";
import { memo, useEffect, useState } from "react";
import FolderRow from "./FolderRow";
import pluralize from "pluralize";
import System from "@/models/system";

function Directory({
  files,
  loading,
  setLoading,
  workspace,
  fetchKeys,
  selectedItems,
  setSelectedItems,
  setHighlightWorkspace,
  moveToWorkspace,
  setLoadingMessage,
  loadingMessage,
}) {
  const [amountSelected, setAmountSelected] = useState(0);

  const deleteFiles = async (event) => {
    event.stopPropagation();
    if (
      !window.confirm(
        "Are you sure you want to delete these files?\nThis will remove the files from the system and remove them from any existing workspaces automatically.\nThis action is not reversible."
      )
    ) {
      return false;
    }

    try {
      const toRemove = [];
      for (const itemId of Object.keys(selectedItems)) {
        for (const folder of files.items) {
          const foundItem = folder.items.find((file) => file.id === itemId);
          if (foundItem) {
            toRemove.push(`${folder.name}/${foundItem.name}`);
            break;
          }
        }
      }
      setLoading(true);
      setLoadingMessage(`Removing ${toRemove.length} documents. Please wait.`);
      await System.deleteDocuments(toRemove);
      await fetchKeys(true);
      setSelectedItems({});
    } catch (error) {
      console.error("Failed to delete the document:", error);
    } finally {
      setLoading(false);
      setSelectedItems({});
    }
  };

  const toggleSelection = (item) => {
    setSelectedItems((prevSelectedItems) => {
      const newSelectedItems = { ...prevSelectedItems };

      if (item.type === "folder") {
        const isCurrentlySelected = isFolderCompletelySelected(item);
        if (isCurrentlySelected) {
          item.items.forEach((file) => delete newSelectedItems[file.id]);
        } else {
          item.items.forEach((file) => (newSelectedItems[file.id] = true));
        }
      } else {
        if (newSelectedItems[item.id]) {
          delete newSelectedItems[item.id];
        } else {
          newSelectedItems[item.id] = true;
        }
      }

      return newSelectedItems;
    });
  };

  const isFolderCompletelySelected = (folder) => {
    if (folder.items.length === 0) {
      return false;
    }
    return folder.items.every((file) => selectedItems[file.id]);
  };

  const isSelected = (id, item) => {
    if (item && item.type === "folder") {
      return isFolderCompletelySelected(item);
    }

    return !!selectedItems[id];
  };

  useEffect(() => {
    setAmountSelected(Object.keys(selectedItems).length);
  }, [selectedItems]);

  return (
    <div className="px-8 pb-8">
      <div className="flex flex-col gap-y-6">
        <div className="flex items-center justify-between w-[560px] px-5">
          <h3 className="text-white text-base font-bold">My Documents</h3>
        </div>

        <div className="relative w-[560px] h-[310px] bg-zinc-900 rounded-2xl">
          <div className="rounded-t-2xl text-white/80 text-xs grid grid-cols-12 py-2 px-8 border-b border-white/20 shadow-lg bg-zinc-900 sticky top-0 z-10">
            <p className="col-span-5">Name</p>
            <p className="col-span-3">Date</p>
            <p className="col-span-2">Kind</p>
            <p className="col-span-2">Cached</p>
          </div>

          <div
            className="overflow-y-auto pb-9"
            style={{ height: "calc(100% - 40px)" }}
          >
            {loading ? (
              <div className="w-full h-full flex items-center justify-center flex-col gap-y-5">
                <PreLoader />
                <p className="text-white/80 text-sm font-semibold animate-pulse text-center w-1/3">
                  {loadingMessage}
                </p>
              </div>
            ) : !!files.items ? (
              files.items.map(
                (item, index) =>
                  (item.name === "custom-documents" ||
                    (item.type === "folder" && item.items.length > 0)) && (
                    <FolderRow
                      key={index}
                      item={item}
                      selected={isSelected(
                        item.id,
                        item.type === "folder" ? item : null
                      )}
                      fetchKeys={fetchKeys}
                      onRowClick={() => toggleSelection(item)}
                      toggleSelection={toggleSelection}
                      isSelected={isSelected}
                      setLoading={setLoading}
                      setLoadingMessage={setLoadingMessage}
                      autoExpanded={index === 0}
                    />
                  )
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-white text-opacity-40 text-sm font-medium">
                  No Documents
                </p>
              </div>
            )}
          </div>

          {amountSelected !== 0 && (
            <div className="absolute bottom-0 left-0 w-full flex justify-between items-center h-9 bg-white rounded-b-2xl">
              <div className="flex gap-x-5 w-[80%] justify-center">
                <button
                  onMouseEnter={() => setHighlightWorkspace(true)}
                  onMouseLeave={() => setHighlightWorkspace(false)}
                  onClick={moveToWorkspace}
                  className="border-none text-sm font-semibold h-7 px-2.5 rounded-lg hover:text-white hover:bg-neutral-800/80 flex items-center"
                >
                  Move {amountSelected} {pluralize("file", amountSelected)} to
                  workspace
                </button>
              </div>
              <button
                onClick={deleteFiles}
                className="border-none text-red-500/50 text-sm font-semibold h-7 px-2.5 rounded-lg hover:text-red-500/80 flex items-center"
              >
                Delete
              </button>
            </div>
          )}
        </div>
        <UploadFile
          workspace={workspace}
          fetchKeys={fetchKeys}
          setLoading={setLoading}
        />
      </div>
    </div>
  );
}

export default memo(Directory);
