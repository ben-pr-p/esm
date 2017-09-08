import React, { Component } from 'react'
import { Card, Input, Layout, Select, Tabs } from 'antd'
import socket from '../socket'
import EventCard from './event-card'

const { Header, Content } = Layout
const { Search } = Input
const { TabPane } = Tabs
const { Option } = Select

const ESM_TAG = 'Event: Should Contact Host'

const tabSpec = [
  {
    title: 'ESM Call #1',
    fn: ev =>
      ev.tags.includes(ESM_TAG) &&
      ev.status == 'tentative' &&
      !ev.tags.includes('Event: Action: Called')
  },
  {
    title: 'Needs Approval',
    fn: ev =>
      ev.status == 'tentative' &&
      (!ev.tags.includes(ESM_TAG) || ev.tags.includes('Event: Action: Called'))
  },
  {
    title: 'Needs Logistics',
    fn: ev =>
      ev.tags.includes(ESM_TAG) &&
      ev.status == 'confirmed' &&
      !ev.tags.includes('Event: Action: Logisticsed')
  },
  {
    title: 'Upcoming',
    fn: ev =>
      ev.status == 'confirmed' &&
      new Date(ev.end_date).getTime() > new Date().getTime() &&
      (!ev.tags.includes(ESM_TAG) ||
        ev.tags.includes('Event: Action: Logisticsed'))
  },
  {
    title: 'Needs Debrief',
    fn: ev =>
      ev.status == 'confirmed' &&
      new Date(ev.end_date).getTime() < new Date().getTime() &&
      !ev.tags.includes('Event: Action: Debriefed')
  },
  {
    title: 'Past',
    fn: ev =>
      new Date(ev.end_date).getTime() < new Date().getTime() &&
      ev.tags.includes('Event: Action: Debriefed')
  },
  {
    title: 'Rejected',
    fn: ev => ev.status == 'rejected'
  },
  {
    title: 'Cancelled',
    fn: ev => ev.status == 'cancelled'
  }
]

export default class Esm extends Component {
  state = {
    events: {},
    channel: null,
    search: '',
    state: null,
    calendars: []
  }

  setSearch = value => this.setState({ search: value })
  setStateFilter = state => this.setState({ state })
  setCalendarFilter = calendars => this.setState({ calendars })

  filteredEvents = () =>
    Object.keys(this.state.events).filter(e => {
      const event = this.state.events[e]

      const searchOk =
        this.state.search != ''
          ? (event.name &&
              event.name
                .toLowerCase()
                .includes(this.state.search.toLowerCase())) ||
            (event.description &&
              event.description
                .toLowerCase()
                .includes(this.state.search.toLowerCase()))
          : true

      const stateOk =
        this.state.state == null || this.state.state.trim() == ''
          ? true
          : event.location.region == this.state.state

      const calendarOk =
        this.state.calendars.length == 0
          ? true
          : this.state.calendars.filter(c =>
              event.tags.includes(`Calendar: ${c}`)
            ).length > 0

      return searchOk && stateOk && calendarOk
    })

  countEventsFor = fn =>
    this.filteredEvents().filter(e => fn(this.state.events[e])).length

  eventsFor = (fn, category) =>
    this.filteredEvents()
      .filter(e => fn(this.state.events[e]))
      .map(id =>
        <EventCard
          key={id}
          event={this.state.events[id]}
          channel={this.state.channel}
          category={category}
        />
      )

  componentDidMount() {
    const token = document
      .querySelector('#guardian_token')
      .getAttribute('content')
    this.state.channel = socket.channel('events', { guardian_token: token })

    this.state.channel
      .join()
      .receive('ok', resp => {
        console.log('Joined successfully', resp)
      })
      .receive('error', resp => {
        console.log('Unable to join', resp)
      })

    this.state.channel.on('event', ({ id, event }) => {
      this.state.events[id] = event
      this.forceUpdate()
    })

    this.state.channel.push('ready')
  }

  render() {
    return (
      <Layout style={{ width: '100%', height: '100%' }}>
        <Header>
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around'
            }}
          >
            <h1 style={{ color: 'white', textTransform: 'capitalize' }}>
              Welcome {window.userEmail.split('@')[0]}!
            </h1>
            <Search
              placeholder="Search title and description"
              style={{ width: 200 }}
              onSearch={this.setSearch}
            />

            <Select
              style={{
                width: 300,
                float: 'right',
                marginTop: 'auto',
                marginBottom: 'auto'
              }}
              mode="multiple"
              defaultValue={[]}
              onChange={this.setCalendarFilter}
              placeholder="Calendar Filter"
            >
              {window.calendarOptions.map(c =>
                <Option value={c}>
                  {c}
                </Option>
              )}
            </Select>

            <Select
              onChange={this.setStateFilter}
              placeholder="State Filter"
              style={{ width: 200 }}
            >
              <Option value="">All States</Option>
              {window.states.map(st =>
                <Option value={st}>
                  {st}
                </Option>
              )}
            </Select>
          </div>
        </Header>
        <Content style={{ height: '100%' }}>
          <Tabs>
            {tabSpec.map(({ title, fn }) =>
              <TabPane
                tab={title + ` (${this.countEventsFor(fn)})`}
                key={title}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {this.eventsFor(fn, title)}
                </div>
              </TabPane>
            )}
          </Tabs>
        </Content>
      </Layout>
    )
  }
}
