import { useEffect, useState } from "react";
import Sidebar, { SidebarMobileHeader } from "../../../components/AdminSidebar";
import { isMobile } from "react-device-detect";
import * as Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { Mail } from "react-feather";
import usePrefersDarkMode from "../../../hooks/usePrefersDarkMode";
import Admin from "../../../models/admin";
import InviteRow from "./InviteRow";
import NewInviteModal, { NewInviteModalId } from "./NewInviteModal";

export default function AdminInvites() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-orange-100 dark:bg-stone-700 flex">
      {!isMobile && <Sidebar />}
      <div
        style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
        className="transition-all duration-500 relative md:ml-[2px] md:mr-[8px] md:my-[16px] md:rounded-[26px] bg-white dark:bg-black-900 md:min-w-[82%] p-[18px] h-full overflow-y-scroll"
      >
        {isMobile && <SidebarMobileHeader />}
        <div className="flex flex-col w-full px-1 md:px-8">
          <div className="w-full flex flex-col gap-y-1">
            <div className="items-center flex gap-x-4">
              <p className="text-3xl font-semibold text-slate-600 dark:text-slate-200">
                Invitations
              </p>
              <button
                onClick={() =>
                  document?.getElementById(NewInviteModalId)?.showModal()
                }
                className="border border-slate-800 dark:border-slate-200 px-4 py-1 rounded-lg text-slate-800 dark:text-slate-200 text-sm items-center flex gap-x-2 hover:bg-slate-800 hover:text-slate-100 dark:hover:bg-slate-200 dark:hover:text-slate-800"
              >
                <Mail className="h-4 w-4" /> Create Invite Link
              </button>
            </div>
            <p className="text-sm font-base text-slate-600 dark:text-slate-200">
              Create invitation links for people in your organization to accept
              and sign up with. Invitations can only be used by a single user.
            </p>
          </div>
          <InvitationsContainer />
        </div>
        <NewInviteModal />
      </div>
    </div>
  );
}

function InvitationsContainer() {
  const darkMode = usePrefersDarkMode();
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState([]);
  useEffect(() => {
    async function fetchInvites() {
      const _invites = await Admin.invites();
      setInvites(_invites);
      setLoading(false);
    }
    fetchInvites();
  }, []);

  if (loading) {
    return (
      <Skeleton.default
        height="80vh"
        width="100%"
        baseColor={darkMode ? "#2a3a53" : null}
        highlightColor={darkMode ? "#395073" : null}
        count={1}
        className="w-full p-4 rounded-b-2xl rounded-tr-2xl rounded-tl-sm mt-6"
        containerClassName="flex w-full"
      />
    );
  }

  return (
    <table className="md:w-3/4 w-full text-sm text-left text-gray-500 dark:text-gray-400 rounded-lg mt-5">
      <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-stone-800 dark:text-gray-400">
        <tr>
          <th scope="col" className="px-6 py-3">
            Status
          </th>
          <th scope="col" className="px-6 py-3 rounded-tl-lg">
            Accepted By
          </th>
          <th scope="col" className="px-6 py-3">
            Created By
          </th>
          <th scope="col" className="px-6 py-3">
            Created
          </th>
          <th scope="col" className="px-6 py-3 rounded-tr-lg">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {invites.map((invite) => (
          <InviteRow key={invite.id} invite={invite} />
        ))}
      </tbody>
    </table>
  );
}
