/**
 * Tableau Data Schema - Auto-generated from Data Source.pdf
 * Contains all table structures and field mappings for your data sources
 */

module.exports = {
  dataSources: {
    // Avaya call data
    avaya: {
      displayName: "Avaya Call Records",
      tables: {
        data_scaffold: {
          fields: ["row_date"],
          description: "Date scaffolding table for time-based analysis"
        },
        call_rec3: {
          fields: [
            "seqnum", "row_date", "disposition", "dispsplit", "firstvdn",
            "vdn2", "vdn3", "vdn4", "vdn5", "vdn6", "vdn7", "vdn8", "vdn9",
            "talktime", "wait_time", "x_trends_wait_sec", "avaya_filter",
            "talktime_sec", "z_avaya_date_range_tf", "answered_dropped",
            "row_date_months", "f1_rebuilt", "z_avaya_date_range", "action_rebuilt"
          ],
          description: "Main call records with talk time and wait metrics"
        }
      },
      joins: [
        { left: "data_scaffold.row_date", right: "call_rec3.row_date" }
      ],
      commonCalculatedFields: {
        "Avg Talk Time (mins)": "AVG([talktime_sec]) / 60",
        "Avg Wait Time (mins)": "AVG([wait_time]) / 60", 
        "Call Volume": "COUNT([seqnum])",
        "Answer Rate %": "SUM([answered_dropped]) / COUNT([seqnum]) * 100"
      }
    },

    // Incident/Request/Chat data by group
    inc_req_chat_grp: {
      displayName: "INC/REQ/Chat - Group View",
      tables: {
        sys_user_group: {
          fields: ["name", "dv_manager"],
          description: "User groups and their managers"
        },
        incident: {
          fields: [
            "business_duration", "number", "dv_assigned_to", "dv_assignment_group",
            "dv_cmdb_ci", "dv_short_description", "dv_class_name", "closed_at",
            "resolved_at", "dv_category", "dv_u_job", "full_name", "latitude",
            "longitude", "date_time", "z_pt_resolved", "z_inc_req_chat",
            "incident_count", "request_count", "business_duration_sec",
            "z_inc_metric_calc", "z_req_metric_calc", "z_inc_req_metrics",
            "z_class_type", "z_inc_metric_pct_tooltip", "z_inc_range_tf"
          ],
          description: "Incident records with timing and assignment data"
        }
      },
      joins: [
        { left: "sys_user_group.sys_id", right: "incident.assignment_group" }
      ],
      commonCalculatedFields: {
        "Avg Resolution Time (hrs)": "AVG([business_duration_sec]) / 3600",
        "Incident Volume": "SUM([incident_count])",
        "Request Volume": "SUM([request_count])",
        "Total Tickets": "[Incident Volume] + [Request Volume]",
        "Resolution Rate %": "SUM([z_pt_resolved]) / COUNT([number]) * 100"
      }
    },

    // Incident/Request/Chat data by technician
    inc_req_chat_tech: {
      displayName: "INC/REQ/Chat - Tech View", 
      tables: {
        incident: {
          fields: [
            "action", "business_duration", "number", "opened_at", "dv_assigned_to",
            "dv_assignment_group", "config_item", "dv_queue", "dv_short_description",
            "dv_sys_class_name", "closed_at", "resolved_at", "dv_category",
            "category_item", "name", "dv_manager", "date_time", "z_inc_req_chat",
            "count", "auto_start_date_next_month", "auto_end_date_next_month",
            "next_month_filter", "business_duration_sec", "duration_days",
            "z_inc_metric_calc", "z_req_metric_calc", "z_inc_req_metrics",
            "z_class_type", "manager_filter_logic", "resolved_on_time_pct",
            "resolved_on_time_label", "z_inc_metric_pct_tooltip",
            "tech_indv_impact_pct", "three_day_incs", "chat_duration",
            "chat_count", "chat_duration_sec", "inc_count", "z_pt_closed",
            "z_inc_data_range", "z_inc_range_tf", "req_count", "three_day_inc_five_day_req"
          ],
          description: "Detailed incident/request data with technician metrics"
        }
      },
      commonCalculatedFields: {
        "MTTR (hrs)": "AVG([business_duration_sec]) / 3600",
        "Ticket Age (hrs)": "DATEDIFF('hour', [opened_at], [closed_at])",
        "Chat Duration (mins)": "[chat_duration_sec] / 60",
        "Resolved On Time": "IF [resolved_on_time_pct] >= 1 THEN 'Yes' ELSE 'No' END",
        "SLA Met %": "[resolved_on_time_pct] * 100",
        "Tech Performance Score": "[tech_indv_impact_pct] * 100",
        "Burn Rate": "[inc_count] - [z_pt_closed]"
      }
    },

    // Manager lookup
    managers: {
      displayName: "Manager Directory",
      tables: {
        sys_user: {
          fields: ["dv_manager", "eus_manager", "name"],
          description: "User and manager relationships"
        }
      },
      commonCalculatedFields: {
        "Manager Hierarchy": "IFNULL([eus_manager], [dv_manager])"
      }
    },

    // ServiceNow call records
    sn_call_record: {
      displayName: "ServiceNow Call Records",
      tables: {
        incident: {
          fields: [
            "config_item", "count", "dv_manager", "dv_u_task_number", "name",
            "number", "opened_at", "short_description", "sn_call_record_count",
            "sn_call_type", "z_filter_reset", "z_inc_range_tf", "z_pt_created"
          ],
          description: "ServiceNow incident records with call data"
        }
      },
      commonCalculatedFields: {
        "Call Volume": "SUM([sn_call_record_count])",
        "Incident Rate": "COUNT([number])",
        "Avg Calls per Incident": "[Call Volume] / [Incident Rate]"
      }
    }
  },

  // Pre-built worksheet templates
  worksheetTemplates: {
    inc_trend: {
      name: "Incident Trend",
      description: "Monthly incident volume trend",
      dataSource: "inc_req_chat_tech",
      config: {
        rows: ["MONTH([opened_at])"],
        columns: ["SUM([inc_count])"],
        marks: "Automatic",
        chartType: "Line"
      }
    },

    burn_rate: {
      name: "Burn Rate Analysis", 
      description: "Open vs closed ticket comparison",
      dataSource: "inc_req_chat_tech",
      config: {
        rows: ["MONTH([opened_at])"],
        columns: ["Measure Values"],
        measures: ["SUM([inc_count])", "SUM([z_pt_closed])"],
        chartType: "Dual Axis"
      }
    },

    mttr_distribution: {
      name: "MTTR Distribution",
      description: "Resolution time distribution by month",
      dataSource: "inc_req_chat_tech", 
      config: {
        rows: ["MONTH([opened_at])"],
        columns: ["AVG([business_duration_sec])"],
        chartType: "Box Plot"
      }
    },

    chat_performance: {
      name: "Chat Performance",
      description: "Chat duration and volume metrics",
      dataSource: "inc_req_chat_tech",
      config: {
        rows: ["[dv_assigned_to]"],
        columns: ["AVG([chat_duration_sec])", "SUM([chat_count])"],
        chartType: "Dual Axis"
      }
    },

    sla_dashboard: {
      name: "SLA Performance",
      description: "On-time resolution tracking",
      dataSource: "inc_req_chat_tech",
      config: {
        rows: ["[dv_manager]"],
        columns: ["AVG([resolved_on_time_pct])"],
        color: "IF AVG([resolved_on_time_pct]) >= 0.9 THEN 'Green' ELSE 'Red' END",
        chartType: "Bar"
      }
    }
  },

  // Business KPIs and their formulas
  businessKPIs: {
    "MTTR (Mean Time to Resolution)": {
      formula: "AVG([business_duration_sec]) / 3600",
      units: "hours",
      target: "< 24 hours",
      dataSource: "inc_req_chat_tech"
    },

    "SLA Compliance Rate": {
      formula: "AVG([resolved_on_time_pct]) * 100",
      units: "percentage",
      target: "> 90%",
      dataSource: "inc_req_chat_tech"
    },

    "Ticket Volume": {
      formula: "SUM([inc_count]) + SUM([req_count])",
      units: "count",
      target: "Baseline tracking",
      dataSource: "inc_req_chat_tech"
    },

    "Chat Utilization": {
      formula: "SUM([chat_duration_sec]) / 3600",
      units: "hours",
      target: "Efficiency tracking",
      dataSource: "inc_req_chat_tech"
    },

    "Call Answer Rate": {
      formula: "SUM([answered_dropped]) / COUNT([seqnum]) * 100",
      units: "percentage", 
      target: "> 80%",
      dataSource: "avaya"
    }
  }
};

// Helper functions for working with the schema
module.exports.getDataSourceFields = function(dataSourceName) {
  const ds = this.dataSources[dataSourceName];
  if (!ds) return null;
  
  const allFields = [];
  for (const [tableName, tableInfo] of Object.entries(ds.tables)) {
    for (const field of tableInfo.fields) {
      allFields.push(`[${field}]`);
    }
  }
  return allFields;
};

module.exports.getCalculatedField = function(dataSourceName, fieldName) {
  const ds = this.dataSources[dataSourceName];
  if (!ds || !ds.commonCalculatedFields) return null;
  return ds.commonCalculatedFields[fieldName];
};

module.exports.getWorksheetTemplate = function(templateName) {
  return this.worksheetTemplates[templateName];
};

module.exports.getBusinessKPI = function(kpiName) {
  return this.businessKPIs[kpiName];
};