import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEquipmentById } from "@/lib/equipment-data";
import { EquipmentDetailView } from "@/components/equipment/EquipmentDetailView";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const equipment = getEquipmentById(id);
  if (!equipment) return {};

  return {
    title: `${equipment.name} | A1 STUDIO`,
    description: equipment.description,
  };
}

export default async function EquipmentDetailPage({ params }: Props) {
  const { id } = await params;
  const equipment = getEquipmentById(id);

  if (!equipment) {
    notFound();
  }

  return <EquipmentDetailView equipment={equipment} />;
}
