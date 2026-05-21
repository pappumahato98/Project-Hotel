## 2024-12-21 - [Reservation Calendar Optimization]
**Learning:** Rendering a large interactive grid (e.g., 2 weeks x 50 rooms) with O(N) filtering in every cell (where N is the number of reservations) leads to O(R*D*N) complexity, causing noticeable lag on data updates and re-renders. Date parsing (parseISO) inside these tight loops adds significant overhead.
**Action:** Always pre-group data by the primary grid axis (e.g., Room ID) and pre-parse values using `useMemo` before rendering the grid to reduce complexity to O(N + R*D).

## 2024-12-21 - [Lookup Complexity in Lists]
**Learning:** Performing array searches (.some, .find) inside a component map (O(N*M)) is a common bottleneck that grows quadratically.
**Action:** Use `useMemo` to convert reference arrays into a `Set` or `Map` for O(1) lookups within the render loop.
