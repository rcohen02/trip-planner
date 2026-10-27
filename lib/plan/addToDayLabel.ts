/** Button text for the one "Add to day" popup opener, shared by the Places list and place detail page. */
export function addToDayLabel(planned: boolean): "Move" | "Add to day" {
  return planned ? "Move" : "Add to day";
}
