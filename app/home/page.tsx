import HeroStage from '@/components/portal/HeroStage'

export default function HomePage() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-[#07080b] text-[#f0ead6] selection:bg-amber-500 selection:text-black">
      <HeroStage />
    </div>
  )
}
