import { Routes, Route } from "react-router-dom";
import QuotesList from "./List";
import QuotesCreate from "./Create";
import QuotesView from "./View";

export default function QuotesPage() {
  return (
    <Routes>
      <Route path="/" element={<QuotesList />} />
      <Route path="/create" element={<QuotesCreate />} />
      <Route path="/:id" element={<QuotesView />} />
    </Routes>
  );
}
