import React, { useEffect, useState } from "react";
import { default as WorkspaceChatContainer } from "../../components/WorkspaceChat";
import Sidebar from "../../components/Sidebar";
import { useParams } from "react-router-dom";
import Workspace from "../../models/workspace";
import SidebarPlaceholder from "../../components/Sidebar/Placeholder";
import ChatPlaceholder from "../../components/WorkspaceChat/LoadingChat";
import PasswordModal, {
  usePasswordModal,
} from "../../components/Modals/Password";
import { isMobile } from "react-device-detect";

export default function WorkspaceChat() {
  const { requiresAuth } = usePasswordModal();
  if (requiresAuth === null || requiresAuth) {
    return (
      <>
        {requiresAuth && <PasswordModal />}
        <div className="w-screen h-screen overflow-hidden bg-orange-100 dark:bg-stone-700 flex">
          {!isMobile && <SidebarPlaceholder />}
          <ChatPlaceholder />
        </div>
      </>
    );
  }

  return <ShowWorkspaceChat />;
}

function ShowWorkspaceChat() {
  const { slug } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getWorkspace() {
      if (!slug) return;
      const _workspace = await Workspace.bySlug(slug);
      setWorkspace(_workspace);
      setLoading(false);
    }
    getWorkspace();
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-orange-100 dark:bg-stone-700 flex">
      {!isMobile && <Sidebar />}
      <WorkspaceChatContainer loading={loading} workspace={workspace} />
    </div>
  );
}
