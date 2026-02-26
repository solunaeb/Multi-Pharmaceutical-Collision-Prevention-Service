import Header from './Header';
import BottomNav from './BottomNav';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  showNav?: boolean;
}

export default function PageContainer({
  children,
  title,
  showBack = false,
  showNav = true,
}: PageContainerProps) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Header title={title} showBack={showBack} />
      <main className="max-w-2xl mx-auto px-5 pb-[80px] pt-lg">
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
