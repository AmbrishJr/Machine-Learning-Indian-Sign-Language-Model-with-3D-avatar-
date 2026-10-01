import './App.css'
import React from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Convert from './Pages/Convert';
import Home from './Pages/Home';
import LearnSign from './Pages/LearnSign';
import Video from './Pages/Video';
import Navbar from './Components/Navbar';
import CreateVideo from './Pages/CreateVideo';
import Footer from './Components/Footer';
import Videos from './Pages/Videos';
import AvatarStudio from './Pages/AvatarStudio';

function AnimatedRoutes() {
  const location = useLocation();
  const shouldReduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const variants = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: shouldReduceMotion ? 0 : -8 },
  };

  const transition = { duration: shouldReduceMotion ? 0 : 0.24, ease: [0.2, 0.8, 0.2, 1] };

  const wrap = (element) => (
    <motion.main
      className="app-main"
      key={location.pathname}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={transition}
    >
      {element}
    </motion.main>
  );

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route exact path='/sign-kit/home' element={wrap(<Home />)} />
        <Route exact path='/sign-kit/convert' element={wrap(<Convert />)} />
        <Route exact path='/sign-kit/learn-sign' element={wrap(<LearnSign />)} />
        <Route exact path='/sign-kit/all-videos' element={wrap(<Videos />)} />
        <Route exact path='/sign-kit/video/:videoId' element={wrap(<Video />)} />
        <Route exact path='/sign-kit/create-video' element={wrap(<CreateVideo />)} />
        <Route exact path='/sign-kit/avatar' element={wrap(<AvatarStudio />)} />
        <Route exact path='*' element={wrap(<Home />)} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return(
    <Router>
      <div className="app-shell">
        <Navbar />
        <AnimatedRoutes />
        <Footer />
      </div>
    </Router>
  )
}

export default App;