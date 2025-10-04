import React from "react";
import BrandVisibilityChart from "@/components/BrandVisibilityChart";

interface BrandVisibilityOverviewProps {
  storeId: string;
}

const BrandVisibilityOverview = ({ storeId }: BrandVisibilityOverviewProps) => {
  return <BrandVisibilityChart storeId={storeId} />;
};

export default BrandVisibilityOverview;
