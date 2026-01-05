import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { makeHslPalette } from "@/lib/chartColors";


ChartJS.register(ArcElement, Tooltip, Legend);

type Props = {
  dataMap: Record<string, number>; 
};

export default function CategoryDoughnut({ dataMap }: Props) {
const labels = Object.keys(dataMap);
const values = Object.values(dataMap);
const colors = makeHslPalette(labels.length);

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderWidth: 1,
      },
    ],
  };


  return <Doughnut data={data} />;
}
