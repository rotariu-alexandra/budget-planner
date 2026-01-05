import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { makeHslPalette } from "@/lib/chartColors";


ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Props = {
  dataMap: Record<string, number>; // yyyy-mm-dd 
};

export default function DailyExpensesBar({ dataMap }: Props) {
  const labels = Object.keys(dataMap).sort();
  const values = labels.map((k) => dataMap[k]);
  const colors = makeHslPalette(labels.length);

  const data = {
    labels,
    datasets: [
      {
        label: "Expenses",
        data: values,
        backgroundColor: colors,
        borderWidth: 1,
      },
    ],
  };

  return <Bar data={data} />;
}
