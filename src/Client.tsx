import axios from "axios";

export type Agent = "Aki" | "Micko" | "Uki" | "Jocke";

const apiUrl = "http://127.0.0.1:8000" || "http://localhost:8000";
axios.defaults.baseURL = "omer2.pythonanywhere.com";

export interface MapData {
  map_name: string;
  coins: Array<IPoint>;
}

export interface IPoint {
  x: number;
  y: number;
}

export interface IStep {
  step: number;
  to_node: number;
  from_node: number;
  cost: number;
}

export default class Client {
  static async getMapsData(): Promise<Array<MapData>> {
    try {
      const response = await axios.get("/maps/");
      return response.data;
    } catch (error) {
      console.error("Error fetching map data:", error);
      throw error;
    }
  }

  static async calculateSteps(mapName: string, agent: Agent): Promise<IStep[]> {
    try {
      const response = await axios.post("/calculate/", {
        map: mapName,
        algorithm: agent,
      });

      return response.data;
    } catch (error) {
      console.error("Error calculating steps:", error);
      throw error;
    }
  }

  static async getGraph(mapName: string): Promise<any> {
    try {
      const response = await axios.post("/graph/", {
        map: mapName,
      });

      return response.data;
    } catch (error) {
      console.error("Error fetching graph:", error);
      throw error;
    }
  }
}
