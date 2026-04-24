import ProductEditor from "@/components/admin/ProductEditor";

export default function AdminTabletsPage() {
  return (
    <ProductEditor
      deviceType="tablet"
      pageTitle="Tablet"
      pageDescription="Manage tablet fields used by public tablet normal and compare pages."
    />
  );
}
