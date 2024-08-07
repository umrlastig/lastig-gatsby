import * as Plot from "@observablehq/plot";
import React, { useEffect, useRef } from "react";

export default function ProjectsPlot({ options }) {
  const containerRef = useRef();

  useEffect(() => {
    if (options == null) return;
    const plot = Plot.plot(options);
    containerRef.current.append(plot);
    return () => plot.remove();
  }, [options]);

  return <div ref={containerRef} />;
}
