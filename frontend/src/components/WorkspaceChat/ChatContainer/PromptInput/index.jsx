import { CircleNotch, PaperPlaneRight } from "@phosphor-icons/react";
import React, { useState, useRef } from "react";
import SlashCommandsButton, {
  SlashCommands,
  useSlashCommands,
} from "./SlashCommands";
import { isMobile } from "react-device-detect";
import debounce from "lodash.debounce";

export default function PromptInput({
  workspace,
  message,
  submit,
  onChange,
  inputDisabled,
  buttonDisabled,
  sendCommand,
}) {
  const { showSlashCommand, setShowSlashCommand } = useSlashCommands();
  const formRef = useRef(null);
  const [_, setFocused] = useState(false);

  const handleSubmit = (e) => {
    setFocused(false);
    submit(e);
  };

  const checkForSlash = (e) => {
    const input = e.target.value;
    if (input === "/") setShowSlashCommand(true);
    if (showSlashCommand) setShowSlashCommand(false);
    return;
  };

  const captureEnter = (event) => {
    if (event.keyCode == 13) {
      if (!event.shiftKey) {
        submit(event);
      }
    }
  };

  const adjustTextArea = (event) => {
    if (isMobile) return false;
    const element = event.target;
    element.style.height = "1px";
    element.style.height =
      event.target.value.length !== 0
        ? 25 + element.scrollHeight + "px"
        : "1px";
  };

  const watchForSlash = debounce(checkForSlash, 300);
  return (
    <div className="w-full fixed md:absolute bottom-0 left-0 z-10 md:z-0 flex justify-center items-center">
      <SlashCommands
        showing={showSlashCommand}
        setShowing={setShowSlashCommand}
        sendCommand={sendCommand}
      />
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-y-1 rounded-t-lg md:w-3/4 w-full mx-auto max-w-xl"
      >
        <div className="flex items-center rounded-lg md:mb-4">
          <div className="w-[600px] bg-main-gradient shadow-2xl border border-white/50 rounded-2xl flex flex-col px-4 overflow-hidden">
            <div className="flex items-center w-full border-b-2 border-gray-500/50">
              <textarea
                onKeyUp={adjustTextArea}
                onKeyDown={captureEnter}
                onChange={(e) => {
                  onChange(e);
                  watchForSlash(e);
                }}
                required={true}
                disabled={inputDisabled}
                onFocus={() => setFocused(true)}
                onBlur={(e) => {
                  setFocused(false);
                  adjustTextArea(e);
                }}
                value={message}
                className="cursor-text max-h-[100px] md:min-h-[40px] mx-2 md:mx-0 py-2 w-full text-[16px] md:text-md text-white bg-transparent placeholder:text-white/60 resize-none active:outline-none focus:outline-none flex-grow"
                placeholder={"Send a message"}
              />
              <button
                ref={formRef}
                type="submit"
                disabled={buttonDisabled}
                className="inline-flex justify-center rounded-2xl cursor-pointer text-white/60 hover:text-white group ml-4"
              >
                {buttonDisabled ? (
                  <CircleNotch className="w-6 h-6 animate-spin" />
                ) : (
                  <PaperPlaneRight className="w-7 h-7 my-3" weight="fill" />
                )}
                <span className="sr-only">Send message</span>
              </button>
            </div>
            <div className="flex justify-between py-3.5">
              <div className="flex gap-x-2">
                <SlashCommandsButton
                  showing={showSlashCommand}
                  setShowSlashCommand={setShowSlashCommand}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
