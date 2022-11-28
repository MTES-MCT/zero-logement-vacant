import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { changeHousingFiltering } from "../store/actions/housingAction";
import { ApplicationState } from "../store/reducers/applicationReducers";
import { useEffect } from "react";
import { initialHousingFilters } from "../store/reducers/housingReducer";

export function useSearch() {
  const dispatch = useDispatch()
  const { search } = useLocation()
  const { filters } = useSelector((state: ApplicationState) => state.housing)

  async function searchWithQuery(query: string): Promise<void> {
    dispatch(changeHousingFiltering({
      ...filters,
      query
    }))
  }

  useEffect(() => {
    const query = new URLSearchParams(search).get('q')
    if (query) {
      dispatch(changeHousingFiltering({ ...initialHousingFilters, query }))
    }
  }, [search, dispatch])

  useEffect(() => {
    dispatch(changeHousingFiltering(filters))
  }, [filters, dispatch])

  return {
    filters,
    searchWithQuery
  }
}
