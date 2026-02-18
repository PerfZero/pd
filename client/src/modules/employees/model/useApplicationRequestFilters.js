import { useEffect, useState } from "react";
import { constructionSiteService } from "@/services/constructionSiteService";
import { counterpartyService } from "@/services/counterpartyService";

export const useApplicationRequestFilters = ({
  user,
  defaultCounterpartyId,
}) => {
  const [sitesLoading, setSitesLoading] = useState(false);
  const [counterpartiesLoading, setCounterpartiesLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);
  const [includeFired, setIncludeFired] = useState(false);
  const [availableSites, setAvailableSites] = useState([]);
  const [availableCounterparties, setAvailableCounterparties] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadSites = async () => {
      setSitesLoading(true);

      try {
        const isDefaultCounterparty =
          user?.counterpartyId === defaultCounterpartyId;

        if (isDefaultCounterparty) {
          const response = await constructionSiteService.getAll();
          const rawSites =
            response?.data?.data?.constructionSites ||
            response?.data?.constructionSites ||
            [];
          if (!cancelled) {
            setAvailableSites(Array.isArray(rawSites) ? rawSites : []);
          }
          return;
        }

        if (!user?.counterpartyId) {
          if (!cancelled) {
            setAvailableSites([]);
          }
          return;
        }

        const response = await constructionSiteService.getCounterpartyObjects(
          user.counterpartyId,
        );
        const rawSites = response?.data?.data || [];
        if (!cancelled) {
          setAvailableSites(Array.isArray(rawSites) ? rawSites : []);
        }
      } catch (error) {
        console.error("Error loading construction sites:", error);
        if (!cancelled) {
          setAvailableSites([]);
        }
      } finally {
        if (!cancelled) {
          setSitesLoading(false);
        }
      }
    };

    loadSites();

    return () => {
      cancelled = true;
    };
  }, [defaultCounterpartyId, user?.counterpartyId]);

  useEffect(() => {
    let cancelled = false;

    const loadCounterparties = async () => {
      if (user?.role !== "admin") {
        setAvailableCounterparties([]);
        setSelectedCounterparty(null);
        return;
      }

      setCounterpartiesLoading(true);
      try {
        const response = await counterpartyService.getAll({
          limit: 10000,
          page: 1,
        });
        const rawCounterparties =
          response?.data?.data?.counterparties || response?.data?.counterparties;

        if (!cancelled) {
          setAvailableCounterparties(
            Array.isArray(rawCounterparties) ? rawCounterparties : [],
          );
        }
      } catch (error) {
        console.error("Error loading counterparties:", error);
        if (!cancelled) {
          setAvailableCounterparties([]);
        }
      } finally {
        if (!cancelled) {
          setCounterpartiesLoading(false);
        }
      }
    };

    loadCounterparties();

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  return {
    searchText,
    setSearchText,
    selectedSite,
    setSelectedSite,
    selectedCounterparty,
    setSelectedCounterparty,
    includeFired,
    setIncludeFired,
    availableSites,
    sitesLoading,
    availableCounterparties,
    counterpartiesLoading,
  };
};
