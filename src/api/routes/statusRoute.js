router.get("/health", (req, res) => {
  return res.json({
    ok: true,
    service: "trader-core",
    timestamp: Date.now(),
  });
});
