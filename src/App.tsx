import React from "react";
import { StudioProvider } from "./context/StudioContext";
import { TopNav } from "./components/TopNav";
import { LeftToolbar } from "./components/LeftToolbar";
import { InfiniteCanvas } from "./components/InfiniteCanvas";
import { RightDrawer } from "./components/RightDrawer";
import { BottomStatusBar } from "./components/BottomStatusBar";
import { AxonometricMassingModal } from "./components/modals/AxonometricMassingModal";
import { AdjacencyMatrixModal } from "./components/modals/AdjacencyMatrixModal";
import { BuildingSectionModal } from "./components/modals/BuildingSectionModal";
import { WindRoseModal } from "./components/modals/WindRoseModal";
import { PresentationPinupModal } from "./components/modals/PresentationPinupModal";

export default function App() {
  return (
    <StudioProvider>
      <div className="flex flex-col h-screen w-screen bg-[#0F0F11] text-[#E4E4E7] overflow-hidden font-sans select-none antialiased">
        {/* Top Architectural Navigation & Live Metrics HUD */}
        <TopNav />

        {/* Studio Workspace Middle Section */}
        <div className="flex flex-1 relative overflow-hidden">
          {/* Left Milanote + Architectural Toolbox */}
          <LeftToolbar />

          {/* Infinite Drafting & Ideation Canvas */}
          <main className="flex-1 relative h-full w-full overflow-hidden">
            <InfiniteCanvas />
          </main>

          {/* Right CAD Rules & AI Assistant Drawer */}
          <RightDrawer />
        </div>

        {/* Bottom Studio Controls & Offline Sync Status */}
        <BottomStatusBar />

        {/* Architectural Studio Modals & Viewers */}
        <AxonometricMassingModal />
        <AdjacencyMatrixModal />
        <BuildingSectionModal />
        <WindRoseModal />
        <PresentationPinupModal />
      </div>
    </StudioProvider>
  );
}
