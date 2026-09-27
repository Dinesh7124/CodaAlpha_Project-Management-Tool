import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

export default function Layout({ children, topbar }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar>{topbar}</Topbar>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
