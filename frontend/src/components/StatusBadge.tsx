import { Chip, CircularProgress, Box } from "@mui/material";
import { CheckCircle, Error, Upload, Autorenew } from "@mui/icons-material";

interface StatusBadgeProps {
  status: "uploaded" | "processing" | "completed" | "failed";
  isStreaming?: boolean;
}

export default function StatusBadge({
  status,
  isStreaming = false,
}: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "uploaded":
        return {
          label: "Uploaded",
          color: "default" as const,
          icon: <Upload fontSize="small" />,
        };
      case "processing":
        return {
          label: "Processing",
          color: "warning" as const,
          icon: isStreaming ? (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <CircularProgress size={16} />
            </Box>
          ) : (
            <Autorenew fontSize="small" />
          ),
        };
      case "completed":
        return {
          label: "Completed",
          color: "success" as const,
          icon: <CheckCircle fontSize="small" />,
        };
      case "failed":
        return {
          label: "Failed",
          color: "error" as const,
          icon: <Error fontSize="small" />,
        };
      default:
        return {
          label: "Unknown",
          color: "default" as const,
          icon: null,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      icon={config.icon}
      variant={status === "processing" && isStreaming ? "filled" : "outlined"}
    />
  );
}
