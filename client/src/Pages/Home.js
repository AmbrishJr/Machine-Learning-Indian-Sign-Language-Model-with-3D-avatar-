import React from "react";
import Services from "../Components/Home/Services";
import Intro from "../Components/Home/Intro";
import Masthead from "../Components/Home/Masthead";

function Home() {
  return (
    <div className="enter">
      <Masthead />
      <Intro />
      <Services />
    </div>
  );
}

export default Home;
