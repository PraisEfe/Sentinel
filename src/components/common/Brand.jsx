import { ChartNoAxesColumnIncreasing } from "lucide-react";
export default function Brand() {
  return (
    <div className="sentinel-brand">
      <span className="brand-mark">
        <ChartNoAxesColumnIncreasing size={23} strokeWidth={3} />
      </span>
      <span>
        <strong>SENTINEL</strong>
        <small>Web intelligence</small>
      </span>
    </div>
  );
}
