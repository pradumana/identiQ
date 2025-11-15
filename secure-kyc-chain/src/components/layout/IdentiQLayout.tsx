import { IdentiQSidebar } from './IdentiQSidebar';
import { IdentiQNavbar } from './IdentiQNavbar';

interface IdentiQLayoutProps {
  children: React.ReactNode;
}

export const IdentiQLayout = ({ children }: IdentiQLayoutProps) => {
  return (
    <div className="min-h-screen bg-white">
      <IdentiQSidebar />
      <IdentiQNavbar />
      <main className="lg:ml-20 pb-20 lg:pb-0">
        {children}
      </main>
    </div>
  );
};

