#!/usr/bin/env python3
"""
jobspy_scraper.py

Scrapes job postings concurrently from multiple platforms using JobSpy
(LinkedIn, Indeed, Glassdoor, ZipRecruiter, Google, Naukri, Bayt, etc.)
and outputs the results directly to a CSV file.
"""

import sys
import os
import argparse
import json
import pandas as pd

try:
    from jobspy import scrape_jobs
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "python-jobspy library is not installed. Please run: pip install python-jobspy"
    }), file=sys.stderr)
    sys.exit(1)

SUPPORTED_SITES = [
    'linkedin', 'indeed', 'zip_recruiter', 'glassdoor',
    'google', 'bayt', 'naukri', 'bdjobs', 'hellowork'
]

CSV_COLUMNS = [
    'id', 'site', 'job_url', 'job_url_direct', 'title', 'company', 'location',
    'date_posted', 'job_type', 'salary_source', 'interval', 'min_amount', 'max_amount',
    'currency', 'is_remote', 'job_level', 'job_function', 'listing_type', 'emails',
    'description', 'company_industry', 'company_url', 'company_logo', 'company_url_direct',
    'company_addresses', 'company_num_employees', 'company_revenue', 'company_description',
    'skills', 'experience_range', 'company_rating', 'company_reviews_count',
    'vacancy_count', 'work_from_home_type'
]

def parse_args():
    parser = argparse.ArgumentParser(description="JobSpy Multi-Platform Job Scraper")
    parser.add_argument("--search-term", type=str, required=True, help="Job title, keywords or query")
    parser.add_argument("--location", type=str, default="", help="Job location (city, state, country or Remote)")
    parser.add_argument("--sites", type=str, default="linkedin,indeed", help="Comma-separated list of job boards")
    parser.add_argument("--results-wanted", type=int, default=15, help="Target number of jobs to fetch per board")
    parser.add_argument("--is-remote", action="store_true", default=False, help="Filter for remote jobs")
    parser.add_argument("--country-indeed", type=str, default="usa", help="Country for Indeed scraping (e.g. usa, india, uk)")
    parser.add_argument("--job-type", type=str, default=None, help="Job type: fulltime, parttime, contract, internship")
    parser.add_argument("--hours-old", type=int, default=None, help="Only return jobs posted within the last X hours")
    parser.add_argument("--output-csv", type=str, required=True, help="Path to write output CSV file")
    return parser.parse_args()

def main():
    args = parse_args()

    # Parse and validate requested sites
    raw_sites = [s.strip().lower() for s in args.sites.split(",") if s.strip()]
    valid_sites = [s for s in raw_sites if s in SUPPORTED_SITES]
    if not valid_sites:
        valid_sites = ['linkedin', 'indeed']

    # Ensure output directory exists
    output_dir = os.path.dirname(os.path.abspath(args.output_csv))
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    scrape_kwargs = {
        "site_name": valid_sites,
        "search_term": args.search_term,
        "results_wanted": max(1, min(args.results_wanted, 50)),
        "verbose": 0,
    }

    if args.location:
        scrape_kwargs["location"] = args.location

    if args.is_remote:
        scrape_kwargs["is_remote"] = True

    if args.country_indeed:
        scrape_kwargs["country_indeed"] = args.country_indeed

    if args.job_type:
        scrape_kwargs["job_type"] = args.job_type.lower()

    if args.hours_old:
        scrape_kwargs["hours_old"] = args.hours_old

    try:
        jobs_df = scrape_jobs(**scrape_kwargs)
    except Exception as e:
        # If scrape_jobs fails completely, create an empty CSV and report error
        empty_df = pd.DataFrame(columns=CSV_COLUMNS)
        empty_df.to_csv(args.output_csv, index=False)
        print(json.dumps({
            "success": False,
            "error": str(e),
            "outputCsv": args.output_csv,
            "count": 0
        }))
        return

    # Check if results returned
    if jobs_df is None or jobs_df.empty:
        empty_df = pd.DataFrame(columns=CSV_COLUMNS)
        empty_df.to_csv(args.output_csv, index=False)
        print(json.dumps({
            "success": True,
            "count": 0,
            "outputCsv": args.output_csv
        }))
        return

    # Ensure all desired columns exist
    for col in CSV_COLUMNS:
        if col not in jobs_df.columns:
            jobs_df[col] = ""

    # Reorder/export to CSV
    jobs_df.to_csv(args.output_csv, index=False, encoding='utf-8')

    print(json.dumps({
        "success": True,
        "count": len(jobs_df),
        "outputCsv": args.output_csv,
        "sites": valid_sites
    }))

if __name__ == "__main__":
    main()
