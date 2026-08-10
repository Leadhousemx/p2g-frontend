import { Outlet } from 'react-router-dom';
import BackOfficeSidebar from '../components/BackOfficeSidebar';
import BackOfficeHeader from '../components/BackOfficeHeader';

export default function BackOfficeLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <BackOfficeSidebar />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <BackOfficeHeader />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
