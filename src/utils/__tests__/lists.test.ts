import { mergeUniqueById } from "../lists";

describe("mergeUniqueById", () => {
  const first = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ];
  const next = [
    { id: "b", name: "B2" },
    { id: "c", name: "C" },
    { id: "", name: "blank" },
  ];

  test("replaces the previous page when asked", () => {
    expect(mergeUniqueById(first, next, true)).toEqual(next);
  });

  test("appends only new ids", () => {
    expect(mergeUniqueById(first, next, false)).toEqual([
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ]);
  });
});
