import React, { useEffect, useRef, useState } from 'react';
import Client, { Agent, IPoint, IStep, MapData } from "./Client";
import Terrain from "./assets/maps/terrain_upscaled.png";
import Coin from "./assets/icons/coin.png";
import Aki from "./assets/icons/Aki.png";
import Uki from "./assets/icons/Uki.png";
import Jocke from "./assets/icons/Jocke.png";
import Micko from "./assets/icons/Micko.png";
import "./App.css";

interface AgentInfo {
  name: Agent;
  icon: string;
}

const App: React.FC = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [agents, setAgents] = useState<AgentInfo[]>([
    { name: "Aki", icon: Aki },
    { name: "Uki", icon: Uki },
    { name: "Jocke", icon: Jocke },
    { name: "Micko", icon: Micko },
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [mapsData, setMapsData] = useState<MapData[] | null>(null);
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo>(null);
  const [agentPosition, setAgentPosition] = useState<IPoint>({ x: 0, y: 0 });
  const [agentMoving, setAgentMoving] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [currentNode, setCurrentNode] = useState<number>(0);
  const [steps, setSteps] = useState<IStep[] | null>(null);
  const [hoveredCoin, setHoveredCoin] = useState<number | null>(null);
  const [graph, setGraph] = useState<number[][] | null>(null);
  const [sumCost, setSumCost] = useState<number>(0);
  const [stepMode, setStepMode] = useState<boolean>(true);
  const [pauseSimulation, setPauseSimulation] = useState<boolean>(false);
  const [pauseIndex, setPauseIndex] = useState<number>(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timer | null>(null);
  const [inTransition, setInTransition] = useState<boolean>(false);

  const scaleCoinX = (x: number): number => {
    if (!mapRef.current) return 0;
    return (x / 1000) * mapRef.current.clientWidth;
  };

  const scaleCoinY = (y: number): number => {
    if (!mapRef.current) return 0;
    return (y / 600) * mapRef.current.clientHeight;
  };

  const setAgent = (agent: AgentInfo): void => {
    setSelectedAgent(agent);
    calculateSteps();
  };

  const moveAgentForward = (): void => {
    if (!selectedMap) return;
    if (currentStep === selectedMap.coins.length) {
      moveAgent(0);
      setSumCost(0);
    } else {
      moveAgent(currentStep + 1);
      setSumCost(sumCost + steps[currentStep + 1].cost);
    }
  };

  const moveAgentBackward = (): void => {
    if (currentStep === 0) {
      return;
    } else {
      moveAgent(currentStep - 1);
      setSumCost(sumCost - steps[currentStep].cost)
    }
  };

  const moveAgent = (step: number): void => {
    if (!steps) return;
    setCurrentNode(steps[step].to_node);
    updateAgentPosition(selectedMap.coins[currentNode]);
    setCurrentStep(step);
    setPauseIndex(step)
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        if (!stepMode || agentMoving) return
        event.preventDefault();
        moveAgentForward();
      } else if (event.key === "ArrowLeft") {
        if (!stepMode || agentMoving) return
        event.preventDefault();
        moveAgentBackward();
      } else if (event.key === "Enter") {
        if (!selectedMap || agentMoving || !steps || steps.length < 0) return;
        event.preventDefault();
        setSumCost(0)
        for (let i = 0; i < steps.length; i++) {
          moveAgent(i);
          setSumCost(prevSumCost => prevSumCost + steps[i].cost);
        }
      } else if ((event.key === "S" || event.key === "s")) {
        setStepMode(!stepMode)
      } else if (event.key === " ") {
        event.preventDefault();
        if (!selectedMap || !steps) return;
    
        if(!inTransition){
          setPauseSimulation(agentMoving)
        }
        
        if(!agentMoving){
          //setSumCost(0)
          //moveAgent(0);
          setAgentMoving(true)
          let i = pauseIndex

          if(i == 0) setSumCost(0)

          const interval = setInterval(() => {
            if (i >= steps.length) {
              setPauseSimulation(false);
              setAgentMoving(false)
              clearInterval(interval);
              setPauseIndex(0)
              return
            }
            console.log("Interval: " + i)
            setInTransition(true)
            //setPauseIndex(i)
            moveAgent(i)
            //setSumCost(prevSumCost => prevSumCost + steps[i].cost);
            i++
            setInTransition(false)
          }, 600);

          setIntervalId(interval)
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [moveAgentForward, moveAgentBackward, selectedMap]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    setupMaps();
  }, []);

  useEffect(() => {
    console.log("Current node: " + currentNode)
  }, [currentNode]);

  useEffect(() => {
    if(pauseSimulation && intervalId != null && !inTransition){
      clearInterval(intervalId)
      setIntervalId(null)
      setAgentMoving(false)
    }
  }, [pauseSimulation]);

  useEffect(() => {
    const fetchData = async () => {
      if (selectedMap != null && selectedAgent != null) {
        await calculateSteps();
        
        if (steps != null && steps.length > 0) {
          setCurrentStep(0);
          setCurrentNode(steps[0].to_node);
          updateAgentPosition(selectedMap.coins[currentNode]);
        }
      }

      if(selectedMap != null){
        setGraph(await Client.getGraph(selectedMap.map_name));
      }
    };

    setSumCost(0)
    fetchData();
  }, [selectedMap]);

  useEffect(() => {
    if (steps) {
      let totalCost = 0;
      for (let num = 0; num <= currentStep; num++) {
        if (steps[num]?.from_node !== steps[num]?.to_node) {
          totalCost += steps[num]?.cost || 0;
        }
      }
      setSumCost(totalCost);
    }
  }, [steps, currentStep]);

  useEffect(() => {
    const fetchData = async () => {
      if (selectedAgent != null) {
        await calculateSteps();

        if (steps != null && steps.length > 0) {
          setCurrentStep(0);
          setCurrentNode(steps[0].to_node);
          updateAgentPosition(selectedMap.coins[currentNode]);
        }
      }
    };

    setSumCost(0)
    fetchData();
  }, [selectedAgent]);

  useEffect(() => {
    if (mapsData != null) {
      setSelectedMap(mapsData[0])
    }
  }, [mapsData])

  const setupMaps = async (): Promise<void> => {
    setLoading(true);

    try {
      setMapsData(await Client.getMapsData());
      await calculateSteps();
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  const selectMap = (map: MapData): void => {
    setSelectedMap(map);
    setAgentPosition(map.coins[0]);
  };

  const calculateSteps = async (): Promise<void> => {
    if (!selectedMap) return;

    setCurrentStep(0);
    setCurrentNode(0);

    updateAgentPosition(selectedMap.coins[currentNode]);
    if (selectedAgent != null) setSteps(await Client.calculateSteps(selectedMap.map_name, selectedAgent.name));
  };

  const updateAgentPosition = async (point: IPoint): Promise<void> => {
    if (mapRef.current) {
      const x = scaleCoinX(point.x);
      const y = scaleCoinY(point.y);
      setAgentPosition({ x, y });
    }
  };

  const getAgentTooltip = (agentName: string): string => {
    switch (agentName) {
      case "Aki":
        return "Agent koristi strategiju pohlepne pretrage po dubini...";
      case "Jocke":
        return "Agent koristi brute-force strategiju tako što generiše sve moguće putanje...";
      case "Uki":
        return "Agent koristi strategiju grananja i ograničavanja...";
      case "Micko":
        return "Agent koristi A* strategiju pretraživanja, pri čemu se za heurističku funkciju koristi minimalno obuhvatno stablo...";
      default:
        return "";
    }
  };

  const navigateToPreviousMap = () => {
    if (mapsData && selectedMap && !agentMoving) {
      const currentIndex = mapsData.findIndex((map) => map.map_name === selectedMap.map_name);
      const previousIndex = currentIndex === 0 ? mapsData.length - 1 : currentIndex - 1;
  
      if (currentIndex !== 0) {
        setSelectedMap(mapsData[previousIndex]);
      }
    }
  };
  
  const navigateToNextMap = () => {
    if (mapsData && selectedMap && !agentMoving) {
      const currentIndex = mapsData.findIndex((map) => map.map_name === selectedMap.map_name);
      const nextIndex = currentIndex === mapsData.length - 1 ? 0 : currentIndex + 1;
  
      if (currentIndex !== mapsData.length - 1) {
        setSelectedMap(mapsData[nextIndex]);
      }
    }
  };

  return (
    <div id="home">
      <div className="title">Pytnik</div>
      <div className='container'>
        <div className={`map${selectedMap ? ' margin-bottom' : ''}`} ref={mapRef}>
          <img src={Terrain} alt="Terrain" />

          <div className="map-overlay">
            <div className="footer"></div>
          </div>

          {selectedMap?.coins.map((coin, index) => (
            <div
              className="coin"
              key={`coin-${index}`}
              style={{
                left: `${scaleCoinX(coin.x)}px`,
                top: `${scaleCoinY(coin.y)}px`,
              }}
              onMouseEnter={() => {
                setHoveredCoin(index);
              }}
              onMouseLeave={() => {
                setHoveredCoin(null);
              }}
            >
              <img src={Coin} alt="Coin" />
              <span>{index}</span>
              {hoveredCoin == index && (
                <div className="hover-message">
                  {selectedMap.coins.map((otherCoin, otherIndex) => (
                    otherIndex !== index && (
                      <p key={`cost-${otherIndex}`}>
                      {`Cena do ${otherIndex}: ${graph[index][otherIndex]}`}
                    </p>
                    )
                  ))}
                </div>
              )}
            </div>
          ))}

          {selectedAgent != null && (
            <div
              className="agent"
              style={{
                left: `${scaleCoinX(selectedMap?.coins[currentNode].x)}px`,
                top: `${scaleCoinY(selectedMap?.coins[currentNode].y)}px`,
              }}
            >
              <img src={selectedAgent.icon} alt={selectedAgent.name} />
            </div>
          )}
        </div>
        <div className="header">
          {agents.map((agent) => (
            <div
              className="agent-selector"
              key={agent.name}
              onClick={() => setAgent(agent)}
            >
              <img src={agent.icon} alt={agent.name} />
              <p>{agent.name}</p>
              <div className="agent-tooltip">
                {getAgentTooltip(agent.name)}
              </div>
            </div>
          ))}
        </div>
        {selectedMap && (
          <div className='steps-container'>
            <div className="steps-title">Koraci:</div>
            <div className="steps">
              {Array.from({ length: currentStep + 1 }).map((_, num) => (
                steps?.[num].from_node !== steps?.[num].to_node && (
                  <div className="step" key={`step-${num}`}>
                    <p>
                      {`Korak: ${steps?.[num].step} | ${steps?.[num].from_node} -> ${steps?.[num].to_node} | Cena: ${steps?.[num].cost}`}
                    </p>
                  </div>
                )
              ))}
            </div>
            <div className="steps-footer">Ukupna cena: {sumCost}</div>
          </div>
        )}
      </div>

      <div className='controls'>
        <p>Pokreni/Pauziraj simulaciju - Razmak</p>
        <p>Prikaži konačan rezultat - Enter</p>
        <p>Uključi/Isključi korake na strelice - S ({stepMode ? ("Uključeno") : ("Isključeno")})</p>
      </div>

      {selectedMap ? (
        <div className="maps-control-container">
          <p className='clickable' onClick={navigateToPreviousMap}>{selectedMap.map_name === mapsData[0].map_name ? '/' : '<<'}</p>
          <p className='map-name'>{selectedMap.map_name}</p>
          <p className='clickable' onClick={navigateToNextMap}>{selectedMap.map_name === mapsData[mapsData.length - 1].map_name ? '/' : '>>'}</p>
        </div>
      ) : null}
    </div>
  );
};

export default App;
