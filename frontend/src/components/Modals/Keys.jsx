import React, { useState, useEffect } from "react";
import { AlertCircle, Loader, X } from "react-feather";
import System from "../../models/system";

const noop = () => false;
export default function KeysModal({ hideModal = noop }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    async function fetchKeys() {
      const settings = await System.keys();
      setSettings(settings);
      setLoading(false);
    }
    fetchKeys();
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] h-full bg-black bg-opacity-50 flex items-center justify-center">
      <div
        className="flex fixed top-0 left-0 right-0 w-full h-full"
        onClick={hideModal}
      />
      <div className="relative w-full max-w-2xl max-h-full">
        <div className="relative bg-white rounded-lg shadow dark:bg-stone-700">
          <div className="flex items-start justify-between p-4 border-b rounded-t dark:border-gray-600">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              System Settings
            </h3>
            <button
              onClick={hideModal}
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
              data-modal-hide="staticModal"
            >
              <X className="text-gray-300 text-lg" />
            </button>
          </div>
          <div className="p-6 space-y-6 flex h-full w-full">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-gray-800 dark:text-gray-200 text-base">
                  loading system settings
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-y-4">
                <div className="bg-orange-300 p-4 rounded-lg border border-orange-600 text-orange-700 w-full items-center flex gap-x-2">
                  <AlertCircle className="h-8 w-8" />
                  <p className="text-sm md:text-base ">
                    Ensure all fields are green before attempting to use
                    AnythingLLM or it may not function as expected!
                  </p>
                </div>
                <ShowKey
                  name="OpenAI API Key"
                  env="OpenAiKey"
                  value={settings?.OpenAiKey ? "*".repeat(20) : ""}
                  valid={settings?.OpenAiKey}
                  allowDebug={settings?.CanDebug}
                />
                <ShowKey
                  name="OpenAI Model for chats"
                  env="OpenAiModelPref"
                  value={settings?.OpenAiModelPref}
                  valid={!!settings?.OpenAiModelPref}
                  allowDebug={settings?.CanDebug}
                />
                <div className="h-[2px] w-full bg-gray-200 dark:bg-stone-600" />
                <ShowKey
                  name="Vector DB Choice"
                  env="VectorDB"
                  value={settings?.VectorDB}
                  valid={!!settings?.VectorDB}
                  allowDebug={settings?.CanDebug}
                />
                {settings?.VectorDB === "pinecone" && (
                  <>
                    <ShowKey
                      name="Pinecone DB API Key"
                      env="PineConeKey"
                      value={settings?.PineConeKey ? "*".repeat(20) : ""}
                      valid={!!settings?.PineConeKey}
                      allowDebug={settings?.CanDebug}
                    />
                    <ShowKey
                      name="Pinecone DB Environment"
                      env="PineConeEnvironment"
                      value={settings?.PineConeEnvironment}
                      valid={!!settings?.PineConeEnvironment}
                      allowDebug={settings?.CanDebug}
                    />
                    <ShowKey
                      name="Pinecone DB Index"
                      env="PineConeIndex"
                      value={settings?.PineConeIndex}
                      valid={!!settings?.PineConeIndex}
                      allowDebug={settings?.CanDebug}
                    />
                  </>
                )}
                {settings?.VectorDB === "chroma" && (
                  <>
                    <ShowKey
                      name="Chroma Endpoint"
                      env="ChromaEndpoint"
                      value={settings?.ChromaEndpoint}
                      valid={!!settings?.ChromaEndpoint}
                      allowDebug={settings?.CanDebug}
                    />
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b dark:border-gray-600">
            <button
              onClick={hideModal}
              type="button"
              className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShowKey({ name, env, value, valid, allowDebug = true }) {
  const [isValid, setIsValid] = useState(valid);
  const [debug, setDebug] = useState(false);
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {};
    const form = new FormData(e.target);
    for (var [key, value] of form.entries()) data[key] = value;
    const { newValues, error } = await System.updateSystem(data);
    if (!!error) {
      alert(error);
      setSaving(false);
      setIsValid(false);
      return;
    }

    setSaving(false);
    setDebug(false);
    setIsValid(true);
  };

  if (!isValid) {
    return (
      <form onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="error"
            className="block mb-2 text-sm font-medium text-red-700 dark:text-red-500"
          >
            {name}
          </label>
          <input
            type="text"
            id="error"
            name={env}
            disabled={!debug}
            className="bg-red-50 border border-red-500 text-red-900 placeholder-red-700 text-sm rounded-lg focus:ring-red-500 dark:bg-gray-700 focus:border-red-500 block w-full p-2.5 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500"
            placeholder={name}
            defaultValue={value}
            required={true}
            autoComplete="off"
          />
          <div className="flex items-center justify-between">
            <p className="mt-2 text-sm text-red-600 dark:text-red-500">
              Need setup in .env file.
            </p>
            {allowDebug && (
              <>
                {debug ? (
                  <div className="flex items-center gap-x-2 mt-2">
                    {saving ? (
                      <>
                        <Loader className="animate-spin h-4 w-4 text-slate-300 dark:text-slate-500" />
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setDebug(false)}
                          className="text-xs text-slate-300 dark:text-slate-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="text-xs text-blue-300 dark:text-blue-500"
                        >
                          Save
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDebug(true)}
                    className="mt-2 text-xs text-slate-300 dark:text-slate-500"
                  >
                    Debug
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <label
          htmlFor="success"
          className="block mb-2 text-sm font-medium text-gray-800 dark:text-slate-200"
        >
          {name}
        </label>
        <input
          type="text"
          id="success"
          name={env}
          disabled={!debug}
          className="border border-white text-green-900 dark:text-green-400 placeholder-green-700 dark:placeholder-green-500 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 dark:bg-gray-700 dark:border-green-500"
          defaultValue={value}
          required={true}
          autoComplete="off"
        />
        {allowDebug && (
          <div className="flex items-center justify-end">
            {debug ? (
              <div className="flex items-center gap-x-2 mt-2">
                {saving ? (
                  <>
                    <Loader className="animate-spin h-4 w-4 text-slate-300 dark:text-slate-500" />
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setDebug(false)}
                      className="text-xs text-slate-300 dark:text-slate-500"
                    >
                      Cancel
                    </button>
                    <button className="text-xs text-blue-300 dark:text-blue-500">
                      Save
                    </button>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setDebug(true)}
                className="mt-2 text-xs text-slate-300 dark:text-slate-500"
              >
                Debug
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  );
}

export function useKeysModal() {
  const [showing, setShowing] = useState(false);
  const showModal = () => {
    setShowing(true);
  };
  const hideModal = () => {
    setShowing(false);
  };

  return { showing, showModal, hideModal };
}
