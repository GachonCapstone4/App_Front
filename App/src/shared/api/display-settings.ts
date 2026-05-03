import type { DisplaySettings, DisplayWidget } from "../types";
import { api } from "./http";

type DisplayWidgetApiItem = {
  id?: string;
  visible?: boolean;
};

type DisplaySettingsApiResponse = {
  theme?: DisplaySettings["theme"];
  widgets?: DisplayWidgetApiItem[];
};

function normalizeWidgets(
  widgets: DisplayWidgetApiItem[] | undefined,
  fallbackWidgets: DisplayWidget[],
) {
  const fallbackById = new Map(fallbackWidgets.map((widget) => [widget.id, widget]));
  const usedIds = new Set<string>();
  const orderedWidgets = (widgets ?? [])
    .filter((widget) => widget.id && fallbackById.has(widget.id))
    .map((widget) => {
      const fallback = fallbackById.get(widget.id as string) as DisplayWidget;
      usedIds.add(fallback.id);

      return {
        ...fallback,
        visible: Boolean(widget.visible),
      };
    });
  const missingWidgets = fallbackWidgets.filter((widget) => !usedIds.has(widget.id));

  return [...orderedWidgets, ...missingWidgets];
}

function mapDisplaySettingsFromApi(
  data: DisplaySettingsApiResponse,
  fallback: DisplaySettings,
): DisplaySettings {
  return {
    ...fallback,
    theme: data.theme === "dark" || data.theme === "light" ? data.theme : fallback.theme,
    widgets: normalizeWidgets(data.widgets, fallback.widgets),
  };
}

function mapDisplaySettingsToApi(settings: DisplaySettings): DisplaySettingsApiResponse {
  return {
    theme: settings.theme,
    widgets: settings.widgets.map((widget) => ({
      id: widget.id,
      visible: widget.visible,
    })),
  };
}

export async function getDisplaySettings(fallback: DisplaySettings) {
  const response = await api.get<DisplaySettingsApiResponse>("/api/users/display-settings");
  return mapDisplaySettingsFromApi(response.data, fallback);
}

export async function updateDisplaySettings(
  settings: DisplaySettings,
  fallback: DisplaySettings,
) {
  const response = await api.patch<DisplaySettingsApiResponse>(
    "/api/users/display-settings",
    mapDisplaySettingsToApi(settings),
  );

  return mapDisplaySettingsFromApi(response.data, fallback);
}
