from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from reports.services.exporters import (
    SUPPORTED_FORMATS,
    export_candidates,
    export_participation,
    export_results,
    export_turnout,
)
from reports.services.report_data import (
    ReportDataError,
    get_candidates_report_data,
    get_participation_report_data,
    get_results_report_data,
    get_turnout_report_data,
)


class BaseReportView(APIView):
    permission_classes = [IsAdmin]

    def fetch_report_data(self, election_id: int | None, academic_year: str | None = None) -> dict:
        raise NotImplementedError

    def build_export(self, fmt: str, data: dict):
        raise NotImplementedError

    def get(self, request):
        export_format = request.query_params.get("export_format", "csv").lower()
        if export_format not in SUPPORTED_FORMATS:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "invalid_format",
                        "message": "export_format must be csv, xlsx, or pdf.",
                        "details": None,
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        election_id = request.query_params.get("election_id")
        parsed_election_id = int(election_id) if election_id else None
        academic_year = request.query_params.get("academic_year")

        try:
            data = self.fetch_report_data(parsed_election_id, academic_year)
        except ReportDataError as exc:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": exc.code,
                        "message": exc.message,
                        "details": None,
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return self.build_export(export_format, data)


class ResultsReportView(BaseReportView):
    def fetch_report_data(self, election_id, academic_year=None):
        return get_results_report_data(election_id, academic_year)

    def build_export(self, fmt, data):
        return export_results(fmt, data)


class CandidatesReportView(BaseReportView):
    def fetch_report_data(self, election_id, academic_year=None):
        return get_candidates_report_data(election_id, academic_year)

    def build_export(self, fmt, data):
        return export_candidates(fmt, data)


class TurnoutReportView(BaseReportView):
    def fetch_report_data(self, election_id, academic_year=None):
        return get_turnout_report_data(election_id, academic_year)

    def build_export(self, fmt, data):
        return export_turnout(fmt, data)


class ParticipationReportView(BaseReportView):
    def fetch_report_data(self, election_id, academic_year=None):
        return get_participation_report_data(election_id, academic_year)

    def build_export(self, fmt, data):
        return export_participation(fmt, data)
