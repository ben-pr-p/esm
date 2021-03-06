import React, { Component } from "react";
import {
  Button,
  Card,
  Checkbox,
  Dropdown,
  Icon,
  Input,
  Layout,
  Menu,
  Modal,
  Tabs,
  Select,
  message
} from "antd";
import EditableText from "./editable-text";
import EditableNumber from "./editable-number";
import EditableDateRange from "./editable-date-range";
import CallLogs from "./call-logs";
import EditLogs from "./edit-logs";
import Turnout from "./turnout";
import clipboard from "clipboard-js";
import mtz from "moment-timezone";

const { TextArea } = Input;
const { Option } = Select;

export default class EventCard extends Component {
  onSave = kv => {
    this.props.channel.push(`edit-${this.props.id}`, kv);
    this.setState({ saving: true });
  };

  onTypeChange = val =>
    this.props.channel.push(`edit-${this.props.id}`, ["type", val]);
  onTagsChange = vals => this.props.channel.push(`tags-${this.props.id}`, vals);
  onCalendarChange = vals =>
    this.props.channel.push(`calendars-${this.props.id}`, vals);

  constructInitial = (state, modifySaving) => () =>
    this.setState(
      Object.assign(
        {
          [state]: true
        },
        modifySaving ? { saving: true } : {}
      )
    );

  constructSetMessage = messageName => e =>
    this.setState({ [messageName]: e.target.value });
  constructFinishProcess = (state, messageName, channelEvent) => () => {
    if (this.state[messageName] == "") {
      this.setState({ [state]: "error" });
    } else {
      this.props.channel.push(`${channelEvent}-${this.props.id}`, {
        message: this.state[messageName]
      });
      this.setState({ [state]: false });
    }
  };

  reject = this.constructInitial("rejecting", true);
  cancel = this.constructInitial("canceling", true);
  duplicate = this.constructInitial("duplicating", false);
  messageAttendees = this.constructInitial("messagingAttendees", false);
  messageHost = this.constructInitial("messagingHost", false);

  setCancelMessage = this.constructSetMessage("cancelMessage");
  setRejectionMessage = this.constructSetMessage("rejectionMessage");
  setHostMessage = this.constructSetMessage("hostMessage");
  setAttendeeMessage = this.constructSetMessage("attendeeMessage");

  finishMessageAttendees = this.constructFinishProcess(
    "messagingAttendees",
    "attendeeMessage",
    "message-attendees"
  );
  finishMessageHost = this.constructFinishProcess(
    "messagingHost",
    "hostMessage",
    "message-host"
  );

  rejectWithMessage = () =>
    this.props.channel.push(`action-${this.props.id}`, {
      status: "rejected",
      message: this.state.rejectionMessage
    });

  cancelWithMessage = () => {
    this.setState({ saving: true });
    this.props.channel.push(`action-${this.props.id}`, {
      status: "cancelled",
      message: this.state.cancelMessage
    });

    this.setState({ saving: true });
  };

  cancelStage2 = () => {
    if (this.state.cancelMessage == "") {
      this.setState({ canceling: "error" });
    } else {
      this.setState({ verifyingCancel: true, canceling: false, saving: false });
    }
  };

  confirm = () => {
    this.props.channel.push(`action-${this.props.id}`, {
      status: "confirmed"
    });
    this.setState({ saving: true });
  };

  makeTentative = () => {
    this.props.channel.push(`action-${this.props.id}`, {
      status: "tentative"
    });
    this.setState({ saving: true });
  };

  markCalled = () => {
    this.props.channel.push(`action-${this.props.id}`, {
      action: "called"
    });
    this.setState({ saving: true });
  };

  markCalledAndConfirm = () => {
    this.setState({ saving: true });
    this.markCalled();
    this.confirm();
  };

  markLogistics = () => {
    this.props.channel.push(`action-${this.props.id}`, {
      action: "logisticsed"
    });
    this.setState({ saving: true });
  };

  markDebriefed = () => {
    this.props.channel.push(`action-${this.props.id}`, {
      action: "debriefed"
    });
    this.setState({ saving: true });
  };

  setDuplicateRange = ([[_a, dup_start_date], [_b, dup_end_date]]) =>
    this.setState({
      dup_start_date,
      dup_end_date
    });

  finishDuplicate = () =>
    this.setState({ doing_duplicating: true }, () =>
      this.props.channel.push(`duplicate-${this.props.id}`, {
        start_date: this.state.dup_start_date,
        end_date: this.state.dup_end_date
      })
    );

  checkout = () => this.props.channel.push(`checkout-${this.props.id}`);
  checkin = () => this.props.channel.push(`checkin-${this.props.id}`);

  state = {
    duplicating: false,
    dup_start_date: undefined,
    dup_end_date: undefined,
    doing_duplicating: false,
    rejecting: false,
    rejectionMessage: "",
    canceling: false,
    verifyingCancel: false,
    cancelMessage: "",
    attendeeMessage: "",
    hostMessage: "",
    messagingAttendees: false,
    messagingHost: false
  };

  componentWillReceiveProps(_nextProps) {
    this.state.saving = false;
    this.state.duplicating = false;
  }

  componentWillMount() {
    this.state.dup_start_date = mtz(this.props.event.start_date)
      .add(7, "days")
      .format();

    this.state.dup_end_date = this.props.event.end_date
      ? mtz(this.props.event.end_date)
          .add(7, "days")
          .format()
      : mtz(this.props.event.start_date)
          .add(7, "days")
          .add(3, "hours")
          .format();
  }

  render() {
    const { event, category } = this.props;

    const {
      title,
      tags,
      capacity,
      status,
      name,
      description,
      summary,
      instructions,
      location,
      start_date,
      end_date,
      created_date,
      contact,
      type,
      rsvp_download_url,
      attendance_count,
      browser_url,
      checked_out_by,
      identifiers
    } = event;

    const disabled =
      (identifiers.length > 1 && this.props.candidate === undefined) ||
      (checked_out_by !== undefined && checked_out_by !== null);

    const isVolEvent =
      tags.filter(t => t.includes("Source: Direct Publish")).length == 0;

    const isDirectPublish =
      tags.filter(t => t.includes("Source: Direct Publish")).length > 0;

    return (
      <Card
        title={
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={title}
            attr="title"
          />
        }
        extra={
          <div style={{ display: "flex" }}>
            {this.state.saving ? (
              <div>
                {" "}
                <Icon type="loading" /> Saving{" "}
              </div>
            ) : disabled ? (
              <div style={{ fontSize: 20, fontWeight: "bold" }}>
                <Icon type="lock" />{" "}
                {checked_out_by
                  ? `Being edited by ${checked_out_by}`
                  : `Not Editable`}
              </div>
            ) : (
              <span key="attendance-count">
                {" "}
                {attendance_count || 0} RSVPs{" "}
              </span>
            )}
            <div key="buttons" style={{ marginLeft: 30 }}>
              {this.renderButtons({ disabled })}
            </div>
          </div>
        }
        style={{ width: "100%", marginTop: 25 }}
        bodyStyle={{
          display: "flex",
          flexWrap: "wrap",
          width: "100%",
          height: 500,
          overflowY: "scroll"
        }}
      >
        <Modal
          visible={this.state.rejecting}
          title="Why are you rejecting the event?"
          okText="Reject and Send"
          onCancel={() => this.setState({ rejecting: false })}
          onOk={this.rejectWithMessage}
        >
          <p>
            Check for typos – this rejection message will be sent directly to
            the event host.
          </p>
          <TextArea
            rows={5}
            onChange={this.setRejectionMessage}
            value={this.state.rejectionMessage}
          />
        </Modal>

        <Modal
          visible={this.state.canceling}
          title="Why are you cancelling this event?"
          okText="Cancel"
          cancelText="Don't Cancel"
          onCancel={() =>
            this.setState({ canceling: false, verifyingCancel: false })
          }
          onOk={this.cancelStage2}
        >
          {`This message will be sent to all ${attendance_count} people who have already RSVPed`}
          {identifiers.length > 1 && (
            <p style={{ color: "red" }}>
              {" "}
              If you cancel event your event here, it NOT will be synced again.
            </p>
          )}
          {this.state.canceling == "error" && (
            <span style={{ color: "red" }}>
              {" "}
              Oops! Look like you forgot to put something here.{" "}
            </span>
          )}
          <TextArea
            rows={5}
            onChange={this.setCancelMessage}
            value={this.state.cancelMessage}
          />
        </Modal>

        <Modal
          visible={this.state.duplicating}
          title="Are you sure?"
          okText={this.state.doing_duplicating ? "Working..." : "Duplicate"}
          onCancel={() => this.setState({ duplicating: false })}
          cancelText="Cancel"
          onOk={this.finishDuplicate}
        >
          <EditableDateRange
            start_date={this.state.dup_start_date}
            end_date={this.state.dup_end_date}
            time_zone={location.time_zone}
            time_zone_display={this.props.event.location.time_zone}
            checkout={() => true}
            onSave={this.setDuplicateRange}
            attr="new_date"
          />
        </Modal>

        <Modal
          visible={this.state.verifyingCancel}
          title="Are you sure?"
          okText="Cancel Irreversibly"
          okType="danger"
          onCancel={() =>
            this.setState({ cancelling: false, verifyingCancel: false })
          }
          cancelText="Don't Cancel"
          onOk={this.cancelWithMessage}
        >
          This cannot be undone.
        </Modal>

        <Modal
          visible={this.state.messagingHost}
          title={`Message the Event Host (${contact.email_address})`}
          okText="Send"
          okType="primary"
          onCancel={() =>
            this.setState({ messagingHost: false, hostMessage: "" })
          }
          cancelText="Cancel"
          onOk={this.finishMessageHost}
        >
          <TextArea
            rows={5}
            onChange={this.setHostMessage}
            value={this.state.hostMessage}
          />
        </Modal>

        <Modal
          visible={this.state.messagingAttendees}
          title={`Message All ${attendance_count} Attendees `}
          okText="Send"
          okType="primary"
          onCancel={() =>
            this.setState({ messagingAttendees: false, attendeeMessage: "" })
          }
          cancelText="Cancel"
          onOk={this.finishMessageAttendees}
        >
          {this.state.messagingAttendees == "error" && (
            <span style={{ color: "red" }}>
              Oops! Look like you forgot to put something here.
            </span>
          )}
          <TextArea
            rows={5}
            onChange={this.setAttendeeMessage}
            value={this.state.attendeeMessage}
          />
        </Modal>

        <div>
          {isDirectPublish && (
            <Button disabled={true} style={{ cursor: "none", color: "green" }}>
              Direct Published
            </Button>
          )}
        </div>

        <br />
        <br />

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Link:</strong>
          <div>
            <a target="_blank" href={browser_url}>
              {browser_url}
            </a>
          </div>
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Capacity:</strong> (set to 0 for unlimited)
          <div>
            <EditableNumber
              disabled={disabled}
              value={capacity}
              attr="capacity"
              onSave={this.onSave}
              checkout={this.checkout}
              checkin={this.checkin}
            />
          </div>
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Submitted At:</strong>
          <div>{new Date(created_date).toString()}</div>
        </div>

        <div
          className="field-group"
          style={{ margin: 10, minWidth: 250, width: "100%" }}
        >
          <strong>Description:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={description}
            attr="description"
            textarea={true}
          />
        </div>

        <div
          className="field-group"
          style={{ margin: 10, minWidth: 250, width: "100%" }}
        >
          <strong>Instructions:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={instructions}
            attr="instructions"
            textarea={true}
          />
        </div>

        <div
          className="field-group"
          style={{ margin: 10, minWidth: 250, width: "100%" }}
        >
          <strong>Type:</strong>{" "}
          <Select
            defaultValue={type}
            style={{ width: 300 }}
            onChange={this.onTypeChange}
          >
            {[
              "Phonebank",
              "Organizing meeting",
              "Tabling or Clipboarding",
              "Canvass",
              "Rally, march, or protest",
              "Other"
            ].map(o => (
              <Option key={o} value={o}>
                {o}
              </Option>
            ))}
          </Select>
        </div>

        {!this.props.hostEdit && (
          <div
            className="field-group"
            style={{ margin: 10, minWidth: 250, width: "100%" }}
          >
            <strong>Calendars:</strong>{" "}
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              placeholder="Calendars"
              onChange={this.onCalendarChange}
              defaultValue={tags
                .filter(t => t.includes("Calendar:"))
                .map(t => t.split(":")[1].trim())
                .filter(s => s != "")}
            >
              {calendarOptions.map(c => (
                <Option key={c} value={c}>
                  {c}
                </Option>
              ))}
            </Select>
          </div>
        )}

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Date and Time</strong> <br />
          <EditableDateRange
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            start_date={start_date}
            end_date={end_date}
            time_zone={location.time_zone}
            time_zone_display={this.props.event.location.time_zone}
            onSave={this.onSave}
            attr="start_date"
          />
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Location</strong>
          <br />
          <Checkbox
            checked={location.public == "1"}
            onChange={e => this.onSave(["location.public", e.target.checked])}
          >
            Address Public?
          </Checkbox>
          <br />
          <br />
          <strong>Venue:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={location.venue}
            attr="location.venue"
          />
          <br />
          <strong>Address:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={location.address_lines[0]}
            attr="location.address_lines[0]"
          />
          <br />
          <strong>City:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={location.locality}
            attr="location.locality"
          />
          <br />
          <strong>State:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={location.region}
            attr="location.region"
          />
          <br />
          <strong>Zip:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={location.postal_code}
            attr="location.postal_code"
          />
        </div>

        <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
          <strong>Host</strong>
          <br />
          <strong>Name:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={contact.name}
            attr="contact.name"
          />
          <br />
          <strong>Phone Number:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={contact.phone_number}
            attr="contact.phone_number"
          />
          <br />
          <strong>Email Address:</strong>{" "}
          <EditableText
            disabled={disabled}
            checkout={this.checkout}
            checkin={this.checkin}
            onSave={this.onSave}
            value={contact.email_address}
            attr="contact.email_address"
          />
        </div>

        {!this.props.hostEdit && (
          <div className="field-group" style={{ margin: 10, minWidth: 250 }}>
            <strong>Tags:</strong>
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              placeholder="Tags"
              onChange={this.onTagsChange}
              defaultValue={tags.filter(
                t => !t.includes("Calendar") && !t.includes("Event Type:")
              )}
            >
              {window.tagOptions
                .filter(
                  t => !t.includes("Event: Action") && !t.includes("Calendar")
                )
                .map(t => <Option key={t}>{t}</Option>)}
            </Select>
          </div>
        )}

        <br />
        <br />

        {!this.props.hostEdit && (
          <div>
            <EditLogs
              id={this.props.id}
              channel={this.props.channel}
              edits={this.props.edits}
            />
            <CallLogs
              id={this.props.id}
              channel={this.props.channel}
              calls={this.props.calls}
            />
          </div>
        )}
      </Card>
    );
  }

  renderButtons({ disabled }) {
    const {
      category,
      event: { rsvp_download_url, organizer_edit_url }
    } = this.props;

    const dropdown = [
      <Dropdown
        key="dropdown-options"
        overlay={
          <Menu>
            {category !== undefined && (
              <Menu.Item>
                <Button style={{ width: "100%" }} onClick={this.messageHost}>
                  Message Host
                </Button>
              </Menu.Item>
            )}

            {category !== undefined && (
              <Menu.Item>
                <Button
                  style={{ width: "100%" }}
                  onClick={this.messageAttendees}
                >
                  Message Attendees
                </Button>
              </Menu.Item>
            )}

            <Menu.Item>
              <Button
                style={{ width: "100%" }}
                onClick={() => window.open(rsvp_download_url)}
              >
                Download RSVPs
              </Button>
            </Menu.Item>

            <Menu.Item>
              <Button
                style={{ width: "100%" }}
                onClick={() =>
                  clipboard
                    .copy(rsvp_download_url)
                    .then(() =>
                      message.success("RSVP download link copied to clipboard")
                    )
                }
              >
                Copy RSVP Download Link
              </Button>
            </Menu.Item>

            <Menu.Item>
              <Button
                style={{ width: "100%" }}
                onClick={() =>
                  clipboard
                    .copy(organizer_edit_url)
                    .then(() =>
                      message.success("Organizer edit link copied to clipboard")
                    )
                }
              >
                Copy Organizer Edit Link
              </Button>
            </Menu.Item>

            {this.props.event.candidate_events_url && (
              <Menu.Item>
                <Button
                  style={{ width: "100%" }}
                  onClick={() =>
                    clipboard
                      .copy(this.props.event.candidate_events_url)
                      .then(() =>
                        message.success(
                          "Organizer edit link copied to clipboard"
                        )
                      )
                  }
                >
                  Copy Candidate Events View Link
                </Button>
              </Menu.Item>
            )}

            <Menu.Item>
              <Button style={{ width: "100%" }} onClick={this.duplicate}>
                Duplicate
              </Button>
            </Menu.Item>
          </Menu>
        }
      >
        <Button>
          More <Icon type="down" />
        </Button>
      </Dropdown>
    ];

    if (disabled) {
      return dropdown;
    }

    return dropdown
      .concat(
        category == "ESM Call" && [
          <Button key="reject" onClick={this.reject} type="danger">
            Reject
          </Button>,
          <Button key="mark-called" onClick={this.markCalled} type="default">
            Mark Called
          </Button>,
          <Button
            key="mark-called-confirm"
            onClick={this.markCalledAndConfirm}
            type="primary"
          >
            Mark Called and Confirm Event
          </Button>
        ]
      )
      .concat(
        category == "Needs Approval" && [
          <Button key="reject" onClick={this.reject} type="danger">
            Reject
          </Button>,
          <Button key="confirm" onClick={this.confirm} type="primary">
            Confirm
          </Button>
        ]
      )
      .concat(
        category == "Needs Logistics" && [
          <Button key="cancel" onClick={this.cancel} type="danger">
            Cancel
          </Button>,
          <Button
            key="mark-logistics"
            onClick={this.markLogistics}
            type="primary"
          >
            Mark Did Logistics Call
          </Button>
        ]
      )
      .concat(
        category == "Needs Debrief" && [
          <Button key="debriefed" onClick={this.markDebriefed} type="primary">
            Mark Debriefed
          </Button>
        ]
      )
      .concat(
        category == "Rejected" && [
          <Button key="rejected" onClick={this.makeTentative} type="primary">
            Back to Tentative
          </Button>
        ]
      )
      .concat(
        category == "Cancelled" && [
          <Button key="tentative" onClick={this.makeTentative} type="primary">
            Back to Tentative
          </Button>
        ]
      )
      .concat(
        category == "Upcoming" && [
          <Button key="cancel" onClick={this.cancel} type="danger">
            Cancel
          </Button>,
          <Button key="tentative" onClick={this.makeTentative} type="primary">
            Back to Tentative
          </Button>
        ]
      )
      .concat(
        category == "Today" && [
          <Button key="cancel" onClick={this.cancel} type="danger">
            Cancel
          </Button>,
          <Button key="tentative" onClick={this.makeTentative} type="primary">
            Back to Tentative
          </Button>
        ]
      )
      .concat(
        category == undefined && [
          <Button key="cancel" onClick={this.cancel} type="danger">
            Cancel
          </Button>
        ]
      );
    // .concat(
    //   this.props.candidate && [
    //     <Turnout
    //       event_id={this.props.id}
    //       survey={this.props.survey}
    //       channel={this.props.channel}
    //     />
    //   ]
    // );
  }
}
